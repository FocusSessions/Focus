"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User, AuthError } from "@supabase/supabase-js";
import type { Profile, ProfileUpdate } from "@/types/supabase";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isGuest: boolean;
}

interface AuthActions {
  signUp: (
    email: string,
    password: string,
    username: string,
    displayName?: string
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signInWithOAuth: (
    provider: "google" | "github" | "apple"
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: ProfileUpdate) => Promise<{ error: string | null }>;
  setupProfile: (username: string, displayName: string) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

async function ensureProfileExists(user: User): Promise<Profile | null> {
  let p = await fetchProfile(user.id);
  
  if (!p && user.user_metadata) {
    const meta = user.user_metadata;
    const baseUsername = meta.username || meta.preferred_username || `user_${user.id.slice(0, 8)}`;
    const displayName = meta.display_name || meta.full_name || meta.name || baseUsername;

    let attempt = 0;
    let currentUsername = baseUsername.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);

    while (attempt < 3) {
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          username: currentUsername,
          display_name: displayName,
          is_public: true,
        });

      if (!insertErr) {
        break;
      }

      if (insertErr.code === "23505") {
        // If it's a unique constraint violation, it could be the ID (profile already exists via trigger)
        // or the username (username taken). Let's check if the ID exists.
        const check = await fetchProfile(user.id);
        if (check) {
          return check; // The trigger made it, we are good.
        }
        
        // It was a username collision! We must randomize and retry.
        const randomSuffix = Math.floor(Math.random() * 10000).toString();
        currentUsername = `${currentUsername.slice(0, 15)}_${randomSuffix}`;
        attempt++;
      } else {
        console.error("[auth] Auto-create profile failed:", insertErr.message);
        break;
      }
    }

    p = await fetchProfile(user.id);
  }
  return p;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isGuest = !user;

  // Boot: check existing session
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          const p = await ensureProfileExists(session.user);
          if (mounted) setProfile(p);
        }
      } catch {
        // No session — guest mode
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") && session?.user) {
        setUser(session.user);
        const p = await ensureProfileExists(session.user);
        if (mounted) setProfile(p);
        if (mounted) setIsLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
        if (mounted) setIsLoading(false);
      } else if (event === "INITIAL_SESSION" && !session?.user) {
        if (mounted) setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
      displayName?: string
    ): Promise<{ error: string | null }> => {
      try {
        // Client-side uniqueness check (informational only — server is the source of truth)
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username.toLowerCase())
          .maybeSingle();

        if (existing) {
          return { error: "That username is already taken. Try another." };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username.toLowerCase(),
              display_name: displayName || username,
            },
          },
        });

        if (error) {
          return { error: friendlyAuthError(error) };
        }

        // Supabase with email confirmation enabled returns user but NO session.
        // Without a session, auth.uid() is null and RLS blocks profile inserts.
        // Also handle the "fake user" case where identities is empty (user already exists).
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          return { error: "An account with this email already exists." };
        }

        if (data.user && !data.session) {
          // Email confirmation is required — profile will be created by
          // the database trigger when they confirm, or on first sign-in.
          // We store the username intent so we can create the profile later.
          return { error: null };
        }

        if (data.user && data.session) {
          // We have a session — create profile now
          // Wait a moment for the trigger to run
          await new Promise((r) => setTimeout(r, 1000));
          let p = await fetchProfile(data.user.id);

          if (!p) {
            // Trigger didn't create the profile — insert manually
            const { error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: data.user.id,
                username: username.toLowerCase(),
                display_name: displayName || username,
                is_public: true,
              });

            if (insertError) {
              console.error("[signUp] Profile insert failed:", insertError.message, insertError.code, insertError.details);
              if (insertError.code === "23505") {
                return { error: "That username was just taken. Please pick another." };
              }
              return { error: "Account created but profile setup failed. Please try signing in." };
            }

            p = await fetchProfile(data.user.id);
          }

          setProfile(p);
        }

        return { error: null };
      } catch (err) {
        console.error("[signUp] Unexpected error:", err);
        return { error: "Something went wrong. Please try again." };
      }
    },
    []
  );

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error: friendlyAuthError(error) };
      return { error: null };
    },
    []
  );

  const signInWithOAuth = useCallback(
    async (
      provider: "google" | "github" | "apple"
    ): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: typeof window !== "undefined"
            ? `${window.location.origin}/auth/callback`
            : undefined,
        },
      });
      if (error) return { error: friendlyAuthError(error) };
      return { error: null };
    },
    []
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not signed in." };

      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) {
        if (error.code === "23505") {
          return { error: "That username is already taken." };
        }
        return { error: "Failed to update profile." };
      }

      const p = await fetchProfile(user.id);
      setProfile(p);
      return { error: null };
    },
    [user]
  );

  const setupProfile = useCallback(
    async (username: string, displayName: string): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not signed in." };

      const currentProfile = await fetchProfile(user.id);
      
      // If they somehow got marked as setup but are still in a broken state, let them fix it
      const isBroken = !currentProfile || currentProfile.username.startsWith("user_");

      if (user.user_metadata?.has_setup_profile && !isBroken) {
        return { error: "Profile has already been set up." };
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ 
          id: user.id,
          username: username.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20), 
          display_name: displayName || username,
          updated_at: new Date().toISOString(),
          is_public: true
        });

      if (profileError) {
        if (profileError.code === "23505") {
          return { error: "That username is already taken. Try another." };
        }
        return { error: "Failed to update profile." };
      }

      const { data, error: userError } = await supabase.auth.updateUser({
        data: { has_setup_profile: true }
      });

      if (userError) {
        return { error: "Failed to save profile setup state." };
      }

      setUser(data.user);
      const p = await fetchProfile(user.id);
      setProfile(p);
      return { error: null };
    },
    [user]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user]);

  const value: AuthContextValue = {
    user,
    profile,
    isLoading,
    isGuest,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    updateProfile,
    setupProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Map Supabase error codes to user-friendly messages
function friendlyAuthError(error: AuthError): string {
  const msg = error.message.toLowerCase();
  if (msg.includes("invalid login")) return "Incorrect email or password.";
  if (msg.includes("email not confirmed"))
    return "Please check your email to confirm your account.";
  if (msg.includes("already registered"))
    return "An account with this email already exists.";
  if (msg.includes("password")) return "Password must be at least 6 characters.";
  if (msg.includes("rate limit"))
    return "Too many attempts. Please wait a moment.";
  return error.message;
}

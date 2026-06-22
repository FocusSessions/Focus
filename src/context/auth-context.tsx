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
          const p = await fetchProfile(session.user.id);
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

      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
        let p = await fetchProfile(session.user.id);

        // Auto-create profile if it doesn't exist yet (e.g. email confirmation flow)
        if (!p && session.user.user_metadata) {
          const meta = session.user.user_metadata;
          const username = meta.username || meta.preferred_username || `user_${session.user.id.slice(0, 8)}`;
          const displayName = meta.display_name || meta.full_name || meta.name || username;

          const { error: insertErr } = await supabase
            .from("profiles")
            .insert({
              id: session.user.id,
              username: username.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20),
              display_name: displayName,
              is_public: true,
            });

          if (!insertErr) {
            p = await fetchProfile(session.user.id);
          } else if (insertErr.code !== "23505") {
            console.error("[auth] Auto-create profile failed:", insertErr.message);
          }
        }

        if (mounted) setProfile(p);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
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

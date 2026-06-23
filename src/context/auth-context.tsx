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
import type { User } from "@supabase/supabase-js";
import type { Profile, ProfileUpdate } from "@/types/supabase";
import { friendlyAuthError } from "@/lib/auth-errors";

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
  const existing = await fetchProfile(user.id);
  if (existing) return existing;

  if (!user.user_metadata) return null;

  const meta = user.user_metadata;
  const base = (meta.username || meta.preferred_username || `user_${user.id.slice(0, 8)}`)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .slice(0, 15);
  const displayName = meta.display_name || meta.full_name || meta.name || base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const username = attempt === 0
      ? base
      : `${base}_${Math.floor(Math.random() * 10000)}`;

    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      username,
      display_name: displayName,
      is_public: true,
    });

    if (!error) return fetchProfile(user.id);

    if (error.code === "23505") {
      // Could be trigger already created the row (ID conflict)
      const check = await fetchProfile(user.id);
      if (check) return check;
      // Otherwise it's a username collision — retry with suffix
      continue;
    }

    console.error("[auth] Profile creation failed:", error.message);
    break;
  }

  return fetchProfile(user.id);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isGuest = !user;

  // Boot: check existing session
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED")) {
        setUser(session.user);
        const p = await ensureProfileExists(session.user);
        if (mounted) setProfile(p);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setProfile(null);
      }

      if (mounted) setIsLoading(false);
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
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: friendlyAuthError(error) };
        return { error: null };
      } catch {
        return { error: "Something went wrong. Please try again." };
      }
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
  }, []);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not signed in." };

      const { error } = await supabase
        .from("profiles")
        .update({ ...updates })
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

      const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);

      // Use upsert so missing profile rows are created, not silently skipped
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            username: cleanUsername,
            display_name: displayName || username,
            is_public: true,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        if (profileError.code === "23505") return { error: "That username is already taken. Try another." };
        return { error: "Failed to update profile." };
      }

      const { data, error: userError } = await supabase.auth.updateUser({
        data: { has_setup_profile: true },
      });

      if (userError) return { error: "Failed to save profile setup state." };

      setUser(data.user);
      const p = await fetchProfile(user.id);
      setProfile(p);
      return { error: null };
    },
    [user]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const p = await fetchProfile(user.id);
      setProfile(p);
    } catch (error) {
      console.error("[auth] Failed to refresh profile:", error);
    }
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

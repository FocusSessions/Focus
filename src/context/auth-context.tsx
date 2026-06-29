"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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

// ---- Dedup lock for ensureProfileExists ----
// Prevents concurrent calls from racing each other and creating duplicate rows.
// Keyed by user ID so that rapid sign-out → sign-in won't return the wrong profile.
let profileLockUserId: string | null = null;
let profileLockPromise: Promise<Profile | null> | null = null;

async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error || !data) return null;
    return data as Profile;
  } catch (err) {
    console.error("[auth] Unexpected error fetching profile:", (err as any)?.message || err);
    return null;
  }
}

async function ensureProfileExistsInner(user: User): Promise<Profile | null> {
  try {
    const existing = await fetchProfile(user.id);
    if (existing) {
      // Auto-patch legacy accounts that have a null username
      if (!existing.username) {
        const fallbackBase = `user_${user.id.slice(0, 8)}`;
        const meta = user.user_metadata || {};
        const betterDisplayName = existing.display_name || meta.display_name || meta.full_name || meta.name || fallbackBase;
        const { error: patchError } = await supabase
          .from("profiles")
          .update({
            username: fallbackBase,
            display_name: betterDisplayName,
          })
          .eq("id", user.id);
          
        if (!patchError) {
          return await fetchProfile(user.id);
        }
      }
      return existing;
    }

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
        const check = await fetchProfile(user.id);
        if (check) return check;
        continue;
      }

      console.error("[auth] Profile creation failed:", error.message);
      break;
    }

    // If we exhausted attempts or fetch still failed, provide a fallback
    // so the UI doesn't break if RLS hides their own profile (e.g., privacy_level = private)
    const finalCheck = await fetchProfile(user.id);
    if (finalCheck) return finalCheck;

    return {
      id: user.id,
      username: meta.username || base,
      display_name: displayName,
      is_public: false, // fallback assumes it might be hidden
      privacy_level: 'private',
      bio: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as Profile;
  } catch (err) {
    console.error("[auth] Unexpected error ensuring profile exists:", (err as any)?.message || err);
    return null;
  }
}

/**
 * Deduplicated wrapper: if a call is already in-flight for the SAME user,
 * return the existing promise instead of starting a parallel one.
 * If a different user triggers this, start a fresh call.
 */
async function ensureProfileExists(user: User): Promise<Profile | null> {
  if (profileLockPromise && profileLockUserId === user.id) return profileLockPromise;
  profileLockUserId = user.id;
  profileLockPromise = ensureProfileExistsInner(user);
  try {
    return await profileLockPromise;
  } finally {
    profileLockPromise = null;
    profileLockUserId = null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isGuest = !user;

  // Tracks whether initSession already handled the initial session,
  // so the onAuthStateChange listener can skip the duplicate INITIAL_SESSION event.
  const initHandledRef = useRef(false);

  // Boot: check existing session
  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (session?.user) {
          setUser(session.user);
          const p = await ensureProfileExists(session.user);
          if (mounted) setProfile(p);
          initHandledRef.current = true;
        }
      } catch (err) {
        console.error("[auth] Session initialization failed:", (err as any)?.message || err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      try {
        if (session?.user) {
          setUser(session.user);

          if (event === "INITIAL_SESSION") {
            // Skip if initSession() already handled this
            if (initHandledRef.current) return;
            const p = await ensureProfileExists(session.user);
            if (mounted) setProfile(p);
          } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            const p = await ensureProfileExists(session.user);
            if (mounted) setProfile(p);
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setProfile(null);

          // Clear ALL local user data before navigating.
          // Wrapped in try/catch so navigation always happens even if IDB fails.
          try {
            const { clearUserData } = await import("@/lib/storage");
            await clearUserData();
          } catch (err) {
            console.error("[auth] Failed to clear user data on sign-out:", (err as any)?.message || err);
          }

          if (typeof window !== "undefined") {
            const path = window.location.pathname;
            if (path !== "/" && path !== "/auth") {
              window.location.href = "/";
            } else {
              window.location.reload();
            }
          }
        }
      } catch (err) {
        console.error("[auth] Auth state change handler failed:", (err as any)?.message || err);
      } finally {
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
        const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        const cleanDisplayName = displayName?.trim();

        // Client-side uniqueness check (informational only — server is the source of truth)
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();

        if (existing) {
          return { error: "That username is already taken. Try another." };
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: cleanUsername,
              display_name: cleanDisplayName || cleanUsername,
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
            let p = await ensureProfileExists(data.user);
            
            if (!p || p.username !== cleanUsername) {
              // Trigger didn't create the profile or fallback returned wrong username — try insert manually
              const { error: insertError } = await supabase
                .from("profiles")
                .insert({
                  id: data.user.id,
                  username: cleanUsername,
                  display_name: cleanDisplayName || cleanUsername,
                  is_public: true,
                });

              if (insertError) {
                console.error("[signUp] Profile insert failed:", insertError.message, insertError.code, insertError.details);
                if (insertError.code === "23505") {
                  return { error: "That username was just taken. Please pick another." };
                }
                return { error: "Account created but profile setup failed. Please try signing in." };
              }

              p = await ensureProfileExists(data.user);
            }

            setProfile(p);
          }

        return { error: null };
      } catch (err) {
        console.error("[signUp] Unexpected error:", (err as any)?.message || err);
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
      try {
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
      } catch {
        return { error: "Something went wrong. Please try again." };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("[auth] Failed to sign out:", (err as any)?.message || err);
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: ProfileUpdate): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not signed in." };

      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.username) {
        sanitizedUpdates.username = sanitizedUpdates.username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "").slice(0, 20);
      }
      if (sanitizedUpdates.display_name) {
        sanitizedUpdates.display_name = sanitizedUpdates.display_name.trim();
      }
      if (typeof sanitizedUpdates.bio === "string") {
        // Trim, strip control characters (keep newlines/tabs), cap at 200 chars
        sanitizedUpdates.bio = sanitizedUpdates.bio
          .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
          .trim()
          .slice(0, 200);
      }

      const { error } = await supabase
        .from("profiles")
        .update(sanitizedUpdates)
        .eq("id", user.id);

      if (error) {
        if (error.code === "23505") {
          return { error: "That username is already taken." };
        }
        console.error("[auth] Profile update failed:", error.message);
        return { error: "Failed to update profile." };
      }

      // Fetch fresh profile directly — ensureProfileExists may return stale data
      const fresh = await fetchProfile(user.id);
      if (fresh) setProfile(fresh);
      return { error: null };
    },
    [user]
  );

  const setupProfile = useCallback(
    async (username: string, displayName: string): Promise<{ error: string | null }> => {
      if (!user) return { error: "Not signed in." };

      const cleanUsername = username.toLowerCase().trim().replace(/[^a-z0-9_]/g, "").slice(0, 20);
      const cleanDisplayName = displayName?.trim() || cleanUsername;

      // Use upsert so missing profile rows are created, not silently skipped
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            username: cleanUsername,
            display_name: cleanDisplayName,
            is_public: true,
          },
          { onConflict: "id" }
        );

      if (profileError) {
        if (profileError.code === "23505") return { error: "That username is already taken. Try another." };
        console.error("[auth] Profile upsert failed:", profileError.message);
        return { error: "Failed to update profile." };
      }

      const { data, error: userError } = await supabase.auth.updateUser({
        data: { has_setup_profile: true },
      });

      if (userError) {
        console.error("[auth] updateUser failed:", userError.message);
        return { error: "Failed to save profile setup state." };
      }

      setUser(data.user);
      // Fetch fresh profile directly — ensureProfileExists may return stale data
      const fresh = await fetchProfile(data.user.id);
      setProfile(fresh);
      return { error: null };
    },
    [user]
  );

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const p = await ensureProfileExists(user);
      setProfile(p);
    } catch (error) {
      console.error("[auth] Failed to refresh profile:", (error as any)?.message || error);
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

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { supabase } from "@/lib/supabase";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/profile");
    }
  }, [user, authLoading, router]);

  // Username availability check (debounced)
  useEffect(() => {
    if (mode !== "signup" || !username) {
      setUsernameStatus("idle");
      return;
    }

    // Validate format
    const valid = /^[a-z0-9_]{3,20}$/.test(username.toLowerCase());
    if (!valid) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();

      setUsernameStatus(data ? "taken" : "available");
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [username, mode]);

  const { signUp, signIn, signInWithOAuth } = useAuth();

  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to reset your password.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/settings`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSuccessMsg("Check your email for a password reset link.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccessMsg(null);
      setLoading(true);

      try {
        if (mode === "signup") {
          if (usernameStatus !== "available") {
            setError("Please choose a valid, available username.");
            setLoading(false);
            return;
          }
          const { error: err } = await signUp(email, password, username, displayName || undefined);
          if (err) {
            setError(err);
          } else {
            // Check if we actually got signed in (session exists)
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              // Brief delay to let auth context process the new session
              // and ensure profile creation completes before the profile page loads
              await new Promise((r) => setTimeout(r, 500));
              router.replace("/profile");
            } else {
              // Email confirmation required
              setSuccessMsg("Account created! Check your email to confirm your account, then sign in.");
            }
          }
        } else {
          const { error: err } = await signIn(email, password);
          if (err) {
            setError(err);
          } else {
            router.push("/");
          }
        }
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [mode, email, password, username, displayName, usernameStatus, signUp, signIn, router]
  );

  const handleOAuth = useCallback(
    async (provider: "google" | "github" | "apple") => {
      setError(null);
      const { error: err } = await signInWithOAuth(provider);
      if (err) setError(err);
    },
    [signInWithOAuth]
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-terracotta" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 text-center">
          <h1 className="font-serif text-3xl text-brown">Focus</h1>
          <p className="mt-1 text-sm text-brown-muted">
            {mode === "signin" ? "Welcome back." : "Create your account."}
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex rounded-full border border-border/50 bg-surface/80 p-1">
          <button
            onClick={() => { setMode("signin"); setError(null); }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-cozy ${
              mode === "signin"
                ? "bg-terracotta text-white"
                : "text-brown-muted hover:text-brown"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(null); }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-cozy ${
              mode === "signup"
                ? "bg-terracotta text-white"
                : "text-brown-muted hover:text-brown"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* OAuth Buttons */}
        <div className="mb-6 space-y-2.5">
          <button
            onClick={() => handleOAuth("google")}
            className="btn-secondary w-full justify-center gap-3"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>
          <button
            onClick={() => handleOAuth("github")}
            className="btn-secondary w-full justify-center gap-3"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>

        </div>

        {/* Divider */}
        <div className="mb-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-brown-muted">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <>
              {/* Username */}
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-brown">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-muted" />
                  <input
                    id="username"
                    type="text"
                    placeholder="your_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    maxLength={20}
                    className="input pl-10 pr-10"
                    required
                    autoComplete="username"
                    spellCheck={false}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && (
                      <Loader2 className="h-4 w-4 animate-spin text-brown-muted" />
                    )}
                    {usernameStatus === "available" && (
                      <Check className="h-4 w-4 text-sage" />
                    )}
                    {usernameStatus === "taken" && (
                      <X className="h-4 w-4 text-terracotta" />
                    )}
                  </div>
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {usernameStatus === "invalid" && "3–20 characters: letters, numbers, underscores only."}
                  {usernameStatus === "taken" && "This username is taken."}
                  {usernameStatus === "available" && <span className="text-sage">Available!</span>}
                  {usernameStatus === "idle" && "This is your unique handle."}
                  {usernameStatus === "checking" && "Checking…"}
                </p>
              </div>
              {/* Display Name */}
              <div>
                <label htmlFor="displayName" className="mb-1.5 block text-sm font-medium text-brown">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-muted" />
                  <input
                    id="displayName"
                    type="text"
                    placeholder="How should we call you?"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="input pl-10"
                    autoComplete="name"
                    spellCheck={false}
                  />
                </div>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  Optional — defaults to your username.
                </p>
              </div>
            </>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-brown">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-muted" />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input pl-10"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-brown">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-muted" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10 pr-10"
                required
                minLength={mode === "signup" ? 6 : undefined}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brown-muted hover:text-brown transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {mode === "signin" && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={handleResetPassword}
                  className="text-xs text-brown-muted hover:text-brown underline underline-offset-2 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-cozy border border-terracotta/30 bg-terracotta/5 px-4 py-3 text-sm text-terracotta animate-in fade-in">
              {error}
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="rounded-cozy border border-sage/30 bg-sage/5 px-4 py-3 text-sm text-sage animate-in fade-in">
              {successMsg}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                {mode === "signin" ? "Sign In" : "Create Account"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Fallback Links */}
        <div className="mt-6 text-center">
          {mode === "signin" ? (
            <p className="text-sm text-brown-muted">
              Don&apos;t have an account?{" "}
              <button
                onClick={() => { setMode("signup"); setError(null); setSuccessMsg(null); }}
                className="font-medium text-terracotta hover:underline underline-offset-2 transition-colors"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p className="text-sm text-brown-muted">
              Already have an account?{" "}
              <button
                onClick={() => { setMode("signin"); setError(null); setSuccessMsg(null); }}
                className="font-medium text-terracotta hover:underline underline-offset-2 transition-colors"
              >
                Sign in
              </button>
            </p>
          )}
        </div>

        {/* Guest CTA */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-brown-muted hover:text-brown transition-colors underline underline-offset-4 decoration-border hover:decoration-brown"
          >
            Continue as Guest — no account needed
          </button>
        </div>

        {/* Fine print */}
        <p className="mt-8 text-center text-[11px] text-brown-muted/60">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const [sessionReady, setSessionReady] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Step 1: Exchange code for session (or detect errors)
  useEffect(() => {
    const handleCallback = async () => {
      // Check for errors in hash fragment (OAuth implicit flow error)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const hashError = hashParams.get("error");
      const hashErrorDesc = hashParams.get("error_description");
      if (hashError) {
        setCallbackError(hashErrorDesc || `Authentication failed: ${hashError}`);
        return;
      }

      // Check for error in search params (PKCE flow error)
      const params = new URLSearchParams(window.location.search);
      const searchError = params.get("error");
      const searchErrorDesc = params.get("error_description");
      if (searchError) {
        setCallbackError(searchErrorDesc || `Authentication failed: ${searchError}`);
        return;
      }

      const code = params.get('code');
      let sessionError = null;
      
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        sessionError = error;
      } else {
        // Fallback to implicit flow (hash fragment) which getSession handles automatically
        const { error } = await supabase.auth.getSession();
        sessionError = error;
      }

      if (sessionError) {
        console.error("Auth callback error:", sessionError?.message || sessionError);
        setCallbackError("Sign-in failed. Please try again.");
      } else {
        setSessionReady(true);
      }
    };

    handleCallback();

    // Timeout fallback: if nothing resolves in 15s, show error
    timeoutRef.current = setTimeout(() => {
      setCallbackError((prev) =>
        prev ? prev : "Sign-in is taking too long. Please try again."
      );
    }, 15000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Step 2: Wait for auth context to finish loading profile, then redirect
  useEffect(() => {
    if (!sessionReady || isLoading) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Profile is loaded (or null if creation failed) — safe to redirect
    router.replace("/profile");
  }, [sessionReady, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        {callbackError ? (
          <>
            <p className="text-sm text-terracotta mb-4">{callbackError}</p>
            <button
              onClick={() => router.replace("/auth")}
              className="btn-primary text-sm"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-terracotta" />
            <p className="text-sm text-brown-muted">Signing you in…</p>
          </>
        )}
      </div>
    </div>
  );
}

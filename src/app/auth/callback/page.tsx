"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/auth-context";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();
  const [sessionReady, setSessionReady] = useState(false);
  const [callbackError, setCallbackError] = useState<string | null>(null);

  // Step 1: Exchange code for session
  useEffect(() => {
    const handleCallback = async () => {
      // Check for code in URL params (PKCE flow)
      const params = new URLSearchParams(window.location.search);
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
  }, []);

  // Step 2: Wait for auth context to finish loading profile, then redirect
  useEffect(() => {
    if (!sessionReady || isLoading) return;
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

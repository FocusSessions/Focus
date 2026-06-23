"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();

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
        console.error("Auth callback error:", sessionError);
      }
      // After OAuth, redirect to profile to complete setup if needed
      router.replace("/profile");
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-border border-t-terracotta" />
        <p className="text-sm text-brown-muted">Signing you in…</p>
      </div>
    </div>
  );
}

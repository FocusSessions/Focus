"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error with context for debugging
    console.error("[FocusApp Error]", {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-serif font-bold text-terracotta/20">500</p>
        <h1 className="mt-4 font-serif text-2xl text-brown">Something went wrong</h1>
        <p className="mt-2 text-sm text-brown-muted">
          An unexpected error occurred. Your data is safe — try refreshing.
        </p>
        <button onClick={reset} className="btn-primary mt-6">
          Try again
        </button>
      </div>
    </div>
  );
}

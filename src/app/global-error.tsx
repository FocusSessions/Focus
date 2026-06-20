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
    console.error("[FocusApp Global Error]", {
      message: error.message,
      digest: error.digest,
      timestamp: new Date().toISOString(),
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-cream font-sans text-brown antialiased flex min-h-screen items-center justify-center">
        <div className="max-w-md px-4 text-center">
          <p className="text-7xl font-serif font-bold text-terracotta/20">Oops</p>
          <h1 className="mt-4 font-serif text-2xl text-brown">Application Error</h1>
          <p className="mt-2 text-sm text-brown-muted">
            A critical error occurred while loading the application shell.
          </p>
          <button
            onClick={() => {
              reset();
              window.location.reload();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-cozy bg-terracotta px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-terracotta-hover mt-6"
          >
            Reload Page
          </button>
        </div>
      </body>
    </html>
  );
}

"use client";

import { useFocus } from "@/context/focus-app";
import { Timer } from "@/components/timer";
import { MusicPlayer } from "@/components/music-player";
import { StopDialog } from "@/components/stop-dialog";
import { RecoveryPrompt } from "@/components/recovery-prompt";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function SessionShell() {
  const { loadState, loadError, retryLoad } = useFocus();

  if (loadState === "loading") {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-16 text-center">
        <p className="text-brown-muted">Loading…</p>
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div className="mx-auto max-w-[640px] px-4 py-16 text-center">
        <p className="text-brown">{loadError}</p>
        <button type="button" className="btn-primary mt-4" onClick={retryLoad}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[640px] px-4 pb-36 pt-10">
        <header className="mb-10 flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-brown-muted transition-all duration-cozy hover:border-terracotta hover:text-terracotta"
            aria-label="Back to profile"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="font-serif text-3xl text-brown">Focus Mode</h1>
            <p className="mt-1 text-sm text-brown-muted">A quiet place to work</p>
          </div>
        </header>

        <Timer />
      </div>

      <MusicPlayer />
      <StopDialog />
      <RecoveryPrompt />
    </>
  );
}

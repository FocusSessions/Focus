"use client";

import { useFocus } from "@/context/focus-app";
import { formatClock } from "@/lib/time";

export function RecoveryPrompt() {
  const { showRecovery, elapsedMs, keepRecovery, discardRecovery } = useFocus();

  if (!showRecovery) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brown/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
    >
      <div className="card w-full max-w-sm p-6">
        <h2 id="recovery-title" className="font-serif text-xl">
          Resume your last session?
        </h2>
        <p className="mt-2 text-sm text-brown-muted">
          A timer was still running when you left. Elapsed time:{" "}
          <span className="font-medium text-brown">{formatClock(elapsedMs)}</span>
        </p>
        <div className="mt-5 flex gap-3">
          <button type="button" className="btn-primary flex-1" onClick={keepRecovery}>
            Keep going
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={discardRecovery}>
            Discard
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { useFocus } from "@/context/focus-app";
import { Timer } from "@/components/timer";
import { HistoryDay } from "@/components/history-day";
import { formatDurationShort } from "@/lib/time";
import { computeStats } from "@/lib/analytics";
import type { FocusSessionActivity } from "@/types";
import { Flame } from "lucide-react";

// Lazy-load below-the-fold and modal components to reduce initial bundle
const HistoryView = dynamic(() => import("@/components/history-view").then(m => ({ default: m.HistoryView })), { ssr: false });
const MusicPlayer = dynamic(() => import("@/components/music-player").then(m => ({ default: m.MusicPlayer })), { ssr: false });
const StopDialog = dynamic(() => import("@/components/stop-dialog").then(m => ({ default: m.StopDialog })), { ssr: false });
const RecoveryPrompt = dynamic(() => import("@/components/recovery-prompt").then(m => ({ default: m.RecoveryPrompt })), { ssr: false });

// Prefetch lazy-loaded components in background after first paint
function prefetchHomeComponents() {
  const idle = typeof requestIdleCallback === "function" ? requestIdleCallback : (cb: () => void) => setTimeout(cb, 200);
  idle(() => {
    import("@/components/history-view").catch(() => {});
    import("@/components/music-player").catch(() => {});
    import("@/components/stop-dialog").catch(() => {});
    import("@/components/recovery-prompt").catch(() => {});
  });
}

export function AppShell() {
  const {
    loadState,
    loadError,
    retryLoad,
    todayList,
    todayTotal,
    isRunning,
    activities,
  } = useFocus();

  // After first paint, prefetch modals + below-fold components in background
  useEffect(() => { prefetchHomeComponents(); }, []);

  const focusSessions = useMemo(() => {
    return activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
  }, [activities]);

  const stats = useMemo(() => computeStats(focusSessions), [focusSessions]);

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

  if (isRunning) {
    return (
      <>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="w-full max-w-xl">
            <Timer focusMode />
          </div>
        </div>
        <StopDialog />
        <RecoveryPrompt />
      </>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-[720px] px-4 md:px-8 pb-24 md:pb-10 pt-6 md:pt-10">
        <header className="mb-10 text-center">
          <h1 className="font-serif text-3xl md:text-4xl text-brown">Focus</h1>
          <p className="mt-1 text-sm text-brown-muted">A quiet place to work</p>
        </header>

        <Timer />

        {/* Streak motivation line */}
        {stats.currentStreak > 0 && (
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-brown-muted">
            <Flame className="h-4 w-4 text-terracotta" />
            <span>
              {stats.focusedToday
                ? `Streak secured. ${stats.currentStreak} day${stats.currentStreak > 1 ? "s" : ""} strong.`
                : `${stats.currentStreak} day streak. Focus today to continue.`}
            </span>
          </div>
        )}

        <section className="mt-10" aria-labelledby="today-heading">
          <HistoryDay 
            day={{
              dateKey: "today",
              label: "Today",
              totalMs: todayTotal,
              activities: todayList
            }}
            defaultOpen={true}
            emptyMessage="Your day is a blank canvas."
            emptyHint="Start a session to log your progress."
          />
        </section>

        <section className="mt-6" aria-labelledby="history-heading">
          <h2 id="history-heading" className="mb-3 font-serif text-xl md:text-2xl pl-1">
            Session History
          </h2>
          <HistoryView />
        </section>
      </div>

      <MusicPlayer />
      <StopDialog />
      <RecoveryPrompt />
    </>
  );
}

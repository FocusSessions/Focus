"use client";

import { useMemo } from "react";
import { useFocus } from "@/context/focus-app";
import { Timer } from "@/components/timer";
import { SessionList } from "@/components/session-list";
import { HistoryView } from "@/components/history-view";
import { HistoryDay } from "@/components/history-day";
import { MusicPlayer } from "@/components/music-player";
import { StopDialog } from "@/components/stop-dialog";
import { RecoveryPrompt } from "@/components/recovery-prompt";
import { formatDurationShort } from "@/lib/time";
import { computeStats } from "@/lib/analytics";
import type { FocusSessionActivity } from "@/types";
import { Flame } from "lucide-react";

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

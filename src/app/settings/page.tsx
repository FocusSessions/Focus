"use client";

import { useEffect, useState } from "react";
import { useFocus } from "@/context/focus-app";
import { DEFAULT_DAILY_GOAL_MINUTES } from "@/types";
import { Check } from "lucide-react";
import Link from "next/link";

const GOAL_PRESETS = [
  { label: "1 hour", minutes: 60 },
  { label: "2 hours", minutes: 120 },
  { label: "4 hours", minutes: 240 },
  { label: "6 hours", minutes: 360 },
  { label: "8 hours", minutes: 480 },
] as const;

export default function SettingsPage() {
  const { dailyGoalMinutes, setDailyGoalMinutes, sessionGoalMinutes, setSessionGoalMinutes, showMilliseconds, setShowMilliseconds, timerDirection, setTimerDirection } = useFocus();
  const [draftMinutes, setDraftMinutes] = useState(String(dailyGoalMinutes));
  const [saved, setSaved] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.theme;
      if (stored === 'dark') {
        setTheme('dark');
      } else if (stored === 'system') {
        setTheme('system');
      } else {
        setTheme('light');
      }
    }
  }, []);

  const updateTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    if (newTheme === 'system') {
      localStorage.theme = 'system';
      document.documentElement.classList.remove('dark');
    } else {
      localStorage.theme = newTheme;
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  useEffect(() => {
    setDraftMinutes(String(dailyGoalMinutes));
  }, [dailyGoalMinutes]);

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  const applyGoal = async (minutes: number) => {
    await setDailyGoalMinutes(minutes);
    setDraftMinutes(String(minutes));
    setSaved(true);
  };

  const handleCustomChange = (raw: string) => {
    if (raw === "" || /^\d+$/.test(raw)) {
      setDraftMinutes(raw);
    }
  };

  const handleCustomBlur = () => {
    const val = Number(draftMinutes);
    if (!draftMinutes || Number.isNaN(val)) {
      setDraftMinutes(String(dailyGoalMinutes));
      return;
    }
    void applyGoal(val);
  };

  const presetMatches = (minutes: number) => dailyGoalMinutes === minutes;

  return (
    <div className="mx-auto max-w-[640px] px-4 pb-36 pt-10">
      <header className="mb-10">
        <h1 className="font-serif text-3xl text-brown">Settings</h1>
        <p className="mt-1 text-sm text-brown-muted">Customize your focus experience</p>
      </header>

      <div className="space-y-6">
        <section id="daily-goal" className="card p-6">
          <div className="mb-1 flex items-center justify-between gap-3">
            <h2 className="text-base font-medium text-brown">Daily Focus Goal</h2>
            {saved && (
              <span className="flex items-center gap-1 text-xs font-medium text-sage animate-in fade-in">
                <Check className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
          </div>
          <p className="mb-5 text-sm text-brown-muted">
            Set how much focused time you want to reach each day. Changes save automatically.
          </p>

          <div className="flex flex-wrap gap-2">
            {GOAL_PRESETS.map(({ label, minutes }) => (
              <button
                key={minutes}
                type="button"
                onClick={() => void applyGoal(minutes)}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium transition-all duration-cozy ${
                  presetMatches(minutes)
                    ? "border-terracotta bg-terracotta text-white"
                    : "border-border bg-surface text-brown-muted hover:border-terracotta/40 hover:text-brown"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label htmlFor="custom-goal" className="mb-2 block text-sm text-brown-muted">
              Custom goal (minutes)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="custom-goal"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                value={draftMinutes}
                onChange={(e) => handleCustomChange(e.target.value)}
                onBlur={handleCustomBlur}
                onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                className="input max-w-[140px]"
              />
              <span className="text-sm text-brown-muted">
                15–1440 min · default {DEFAULT_DAILY_GOAL_MINUTES / 60}h
              </span>
            </div>
          </div>
        </section>

        <section id="display" className="card p-6">
          <div className="mb-5">
            <h2 className="text-base font-medium text-brown">Display Options</h2>
            <p className="text-sm text-brown-muted">
              Customize how information is shown on the screen.
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4">
            <div>
              <span className="block text-sm font-medium text-brown">Show Milliseconds</span>
              <span className="block text-xs text-brown-muted">Display milliseconds on the active timer</span>
            </div>
            <button
              type="button"
              onClick={() => setShowMilliseconds(!showMilliseconds)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-cozy focus:outline-none focus:ring-2 focus:ring-terracotta focus:ring-offset-2 focus:ring-offset-cream ${
                showMilliseconds ? "bg-terracotta" : "bg-border"
              }`}
            >
              <span className="sr-only">Toggle milliseconds</span>
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-cozy ${
                  showMilliseconds ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>



          <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-4 pt-4">
            <div>
              <span className="block text-sm font-medium text-brown">Theme</span>
              <span className="block text-xs text-brown-muted">Choose your preferred appearance</span>
            </div>
            <div className="flex rounded-lg border border-border p-0.5 bg-surface">
              <button
                onClick={() => updateTheme('light')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  theme === 'light' ? 'bg-terracotta text-white' : 'text-brown-muted hover:text-brown'
                }`}
              >
                Light
              </button>
              <button
                onClick={() => updateTheme('dark')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  theme === 'dark' ? 'bg-terracotta text-white' : 'text-brown-muted hover:text-brown'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => updateTheme('system')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  theme === 'system' ? 'bg-terracotta text-white' : 'text-brown-muted hover:text-brown'
                }`}
              >
                System
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <span className="block text-sm font-medium text-brown">Timer Direction</span>
              <span className="block text-xs text-brown-muted">
                {timerDirection === 'up' ? "Count up from zero" : "Count down from your session target"}
              </span>
            </div>
            <div className="flex rounded-lg border border-border p-0.5 bg-surface">
              <button
                onClick={() => setTimerDirection('up')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timerDirection === 'up' ? 'bg-terracotta text-white' : 'text-brown-muted hover:text-brown'
                }`}
              >
                Count Up
              </button>
              <button
                onClick={() => setTimerDirection('down')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  timerDirection === 'down' ? 'bg-terracotta text-white' : 'text-brown-muted hover:text-brown'
                }`}
              >
                Count Down
              </button>
            </div>
          </div>

          {timerDirection === 'down' && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 border-t border-border/40 pt-4">
              <label htmlFor="session-goal" className="mb-2 block text-sm text-brown-muted">
                Session Target (minutes)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  id="session-goal"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={3}
                  value={sessionGoalMinutes}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "" || /^\d+$/.test(raw)) {
                      setSessionGoalMinutes(Number(raw) || 0);
                    }
                  }}
                  onBlur={() => {
                    if (!sessionGoalMinutes || sessionGoalMinutes < 5) {
                      setSessionGoalMinutes(25);
                    }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className="input max-w-[140px]"
                />
                <div className="flex gap-2">
                  {[15, 25, 45, 90].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setSessionGoalMinutes(mins)}
                      className={`rounded-xl px-3 py-1 text-xs font-medium transition-colors ${
                        sessionGoalMinutes === mins
                          ? 'bg-sage text-white'
                          : 'bg-surface text-brown-muted border border-border hover:border-sage hover:text-sage'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-brown">Productivity Score Formula</h2>
              <p className="mt-1 text-sm text-brown-muted">
                Learn how your score is calculated.
              </p>
            </div>
            <Link 
              href="/productivity-score" 
              className="rounded-md bg-surface px-3 py-1.5 text-xs font-medium text-sage hover:bg-surface-dark transition-colors border border-border"
            >
              Read More
            </Link>
          </div>
        </section>

        <section className="card relative p-6 opacity-60 backdrop-blur-md">
          <span className="absolute right-4 top-4 rounded-full border border-border bg-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-terracotta">
            Beta
          </span>
          <h2 className="mb-1 text-base font-medium text-brown">Integrations</h2>
          <p className="text-sm text-brown-muted">
            Discord Rich Presence and other integrations are coming soon.
          </p>
        </section>
      </div>
    </div>
  );
}

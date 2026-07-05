"use client";

import { useMemo, useEffect, useState, useRef, startTransition } from "react";
import { formatFocusClock, formatDurationShort } from "@/lib/time";
import { useFocus } from "@/context/focus-app";
import { Pause, Play, Square, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import { computeStats } from "@/lib/analytics";
import type { FocusSessionActivity } from "@/types";

interface TimerProps {
  focusMode?: boolean;
}

export function Timer({ focusMode = false }: TimerProps) {
  const {
    elapsedMs,
    isRunning,
    isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    requestStop,
    pendingStop,
    todayTotal,
    dailyGoalMinutes,
    showMilliseconds,
    activities,
    timerDirection,
    plannedCategory,
    setPlannedCategory,
    sessionGoalMinutes,
    setSessionGoalMinutes,
    customCategories,
    addCustomCategory,
  } = useFocus();

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  const DEFAULT_CATEGORIES = ['Work', 'Study', 'Coding', 'Reading', 'Gaming'];
  const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];

  const handleAddCustom = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    if (!allCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      addCustomCategory(trimmed);
    }
    setPlannedCategory(trimmed);
    setCustomCategoryInput("");
    setShowCustomInput(false);
  };

  useEffect(() => {
    if (showCustomInput && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [showCustomInput]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    // Initial check
    handleFullscreenChange();

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const idle = !isRunning;
  const goalMs = dailyGoalMinutes * 60 * 1000;
  const totalWithCurrent = todayTotal + elapsedMs;

  const focusSessions = useMemo(() => {
    return activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
  }, [activities]);
  
  const stats = useMemo(() => computeStats(focusSessions), [focusSessions]);

  const sessionGoalMs = sessionGoalMinutes * 60 * 1000;
  
  let displayString = "00:00:00";
  if (timerDirection === 'down') {
    const remaining = Math.max(0, sessionGoalMs - elapsedMs);
    displayString = formatFocusClock(remaining, showMilliseconds);
  } else {
    displayString = formatFocusClock(elapsedMs, showMilliseconds);
  }

  /* ─── Keyboard Shortcuts Removed ─── */

  /* ─── Focus mode: full-screen immersive view ─── */
  if (focusMode) {
    return (
      <motion.section
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Focus timer"
        className="flex flex-col items-center justify-center text-center"
      >
        {/* Session identity */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 1.2, ease: "easeOut" }}
          className="mb-8 flex flex-col items-center space-y-1"
        >
          <span className="text-xl font-serif font-medium text-brown">Focus Session</span>
        </motion.div>

        {/* Timer display */}
          <div className="flex flex-col items-center justify-center py-8">
            <p
              className="font-mono tabular-nums tracking-tight text-brown text-[15vw] sm:text-[100px] leading-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {displayString}
            </p>
          </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          {isRunning && !isPaused && (
            <>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                className="btn bg-brown text-cream min-w-[140px] rounded-2xl px-6 py-4 shadow-sm hover:bg-brown/90"
                onClick={pauseTimer}
              >
                <Pause className="h-5 w-5" aria-hidden="true" />
                Pause
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                className="btn border border-terracotta/40 bg-terracotta/10 text-terracotta min-w-[140px] rounded-2xl px-6 py-4 hover:bg-terracotta/20"
                onClick={requestStop}
                aria-label="Stop and save session"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                Stop
              </motion.button>
            </>
          )}

          {isRunning && isPaused && (
            <>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                className="btn-primary min-w-[140px] rounded-2xl px-6 py-4 shadow-sm"
                onClick={resumeTimer}
              >
                <Play className="h-5 w-5" aria-hidden="true" />
                Resume
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="button"
                className="btn border border-terracotta/40 bg-terracotta/10 text-terracotta min-w-[140px] rounded-2xl px-6 py-4 hover:bg-terracotta/20"
                onClick={requestStop}
                aria-label="Stop and save session"
              >
                <Square className="h-4 w-4 fill-current" aria-hidden="true" />
                Stop
              </motion.button>
            </>
          )}
        </div>
        
        {!isFullscreen && (
          <p className="mt-8 text-xs font-medium text-terracotta opacity-80 animate-in fade-in slide-in-from-bottom-2">
            Press F11 to return to fullscreen
          </p>
        )}
      </motion.section>
    );
  }

  /* ─── Idle mode: main page timer card ─── */
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-2xl mx-auto">
      <motion.section
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        aria-label="Focus timer"
        className="card w-full flex flex-col items-center justify-center text-center px-8 py-12"
      >
        <h2 className="mb-8 font-serif text-2xl font-medium tracking-tight text-brown">
          Focus Session
        </h2>

        <div className="relative mb-10 flex items-center justify-center">
          <div className="flex flex-col items-center justify-center py-4">
            <p
              className="font-mono tabular-nums tracking-tight text-brown text-[15vw] sm:text-[100px] leading-none"
              aria-live="polite"
              aria-atomic="true"
            >
              {displayString}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-6">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            className="btn-primary min-w-[160px] rounded-xl px-8 py-4 text-base shadow-sm"
            onClick={() => {
              startTimer();
              try {
                if (document.documentElement.requestFullscreen) {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              } catch (err) {}
            }}
          >
            <Play className="h-6 w-6" aria-hidden="true" />
            Start
          </motion.button>

          <div className="flex flex-col items-center gap-6 mt-4 w-full">
            {timerDirection === 'down' && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-top-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-brown-muted mb-2">
                  Session Target
                </span>
                <div className="flex flex-wrap justify-center gap-2">
                  {[15, 25, 45, 90].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        startTransition(() => {
                          setSessionGoalMinutes(mins);
                        });
                      }}
                      className={`rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
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
            )}

            <div className="flex flex-col items-center w-full max-w-md animate-in fade-in slide-in-from-top-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-brown-muted mb-2">
                Category
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                {allCategories.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`rounded-full px-3 py-1 text-[11px] font-medium border transition-colors ${plannedCategory.toLowerCase() === c.toLowerCase() ? 'bg-terracotta text-white border-terracotta' : 'bg-surface text-brown-muted border-border hover:bg-brown/5'}`}
                    onClick={() => {
                      startTransition(() => {
                        setPlannedCategory(c);
                      });
                    }}
                  >
                    {c}
                  </button>
                ))}

                {/* Add custom category */}
                {showCustomInput ? (
                  <div className="flex items-center gap-1 animate-fade-in">
                    <input
                      ref={customInputRef}
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddCustom();
                        if (e.key === "Escape") {
                          setShowCustomInput(false);
                          setCustomCategoryInput("");
                        }
                      }}
                      maxLength={20}
                      placeholder="e.g. Music"
                      className="input text-[11px] px-2.5 py-1 w-24 bg-surface rounded-full"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustom}
                      disabled={!customCategoryInput.trim()}
                      className="flex h-6 w-6 items-center justify-center rounded-full bg-sage text-white text-xs disabled:opacity-40 transition-opacity"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowCustomInput(false); setCustomCategoryInput(""); }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-brown-muted hover:text-brown transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium border border-dashed border-border text-brown-muted hover:border-terracotta/50 hover:text-terracotta transition-colors flex items-center gap-1"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Custom
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stats below timer (Separate Card) */}
      <motion.section
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="card w-full p-6"
      >
        <div className="grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brown-muted">
              Current Streak
            </p>
            <p className="mt-1.5 text-xl font-medium text-brown">
              {stats.currentStreak} {stats.currentStreak === 1 ? "day" : "days"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brown-muted">
              Today
            </p>
            <p className="mt-1.5 text-xl font-medium text-brown">
              {formatDurationShort(totalWithCurrent)}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brown-muted">
              Sessions
            </p>
            <p className="mt-1.5 text-xl font-medium text-brown">
              {stats.totalSessions}
            </p>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

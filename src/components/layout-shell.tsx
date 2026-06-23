"use client";

import { useEffect } from "react";
import { useFocus } from "@/context/focus-app";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { isRunning, isPaused, startTimer, pauseTimer, resumeTimer } = useFocus();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

      if (e.code === "Space") {
        e.preventDefault();
        if (isRunning) {
          if (isPaused) resumeTimer();
          else pauseTimer();
        } else {
          startTimer();
        }
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, isPaused, startTimer, pauseTimer, resumeTimer]);

  return (
    <main id="main-content" className={`min-h-screen transition-[padding] duration-300 ${isRunning ? "" : "pb-[76px] md:pb-0 md:pl-44"}`}>
      {children}
    </main>
  );
}

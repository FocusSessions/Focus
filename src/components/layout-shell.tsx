"use client";

import { useFocus } from "@/context/focus-app";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { isRunning } = useFocus();

  return (
    <main id="main-content" className={`min-h-screen transition-[padding] duration-300 ${isRunning ? "" : "pb-[76px] md:pb-0 md:pl-44"}`}>
      {children}
    </main>
  );
}

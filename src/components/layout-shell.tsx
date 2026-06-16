"use client";

import { useFocus } from "@/context/focus-app";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const { isRunning } = useFocus();

  return (
    <div className={`min-h-screen transition-[padding] duration-300 ${isRunning ? "" : "pl-44"}`}>
      {children}
    </div>
  );
}

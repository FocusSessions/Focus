"use client";

import { useFocus } from "@/context/focus-app";
import { HistoryDay } from "@/components/history-day";

import { History } from "lucide-react";

export function HistoryView() {
  const { history } = useFocus();

  if (history.length === 0) {
    return (
      <div className="card flex min-h-[300px] flex-col items-center justify-center p-8 text-center animate-zoom-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cream mb-4">
          <History className="h-8 w-8 text-brown-muted" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl font-serif font-medium text-brown mb-2">
          No previous sessions yet
        </h2>
        <p className="max-w-sm text-sm text-brown-muted leading-relaxed mb-6">
          Completed sessions will appear here, grouped by day.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((day) => (
        <HistoryDay key={day.dateKey} day={day} />
      ))}
    </div>
  );
}

"use client";

import { useFocus } from "@/context/focus-app";
import { HistoryDay } from "@/components/history-day";

export function HistoryView() {
  const { history } = useFocus();

  if (history.length === 0) {
    return (
      <div className="card px-5 py-8 text-center">
        <p className="text-brown">No previous sessions yet.</p>
        <p className="mt-2 text-sm text-brown-muted">
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

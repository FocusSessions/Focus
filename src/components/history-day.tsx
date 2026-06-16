"use client";

import { useState } from "react";
import type { DayGroup } from "@/types";
import { formatDurationShort } from "@/lib/time";
import { SessionList } from "@/components/session-list";
import { ChevronDown } from "lucide-react";

interface HistoryDayProps {
  day: DayGroup;
  defaultOpen?: boolean;
  emptyMessage?: string;
  emptyHint?: string;
}

export function HistoryDay({ day, defaultOpen = false, emptyMessage = "No sessions recorded.", emptyHint }: HistoryDayProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left transition-opacity duration-cozy ease-out hover:opacity-80"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>
          <span className="font-serif text-lg text-brown">{day.label}</span>
          <span className="ml-3 text-sm text-brown-muted">
            {formatDurationShort(day.totalMs)} total
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 text-brown-muted transition-transform duration-cozy ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="border-t border-border px-2 pb-3 pt-2">
          <SessionList
            activities={day.activities}
            emptyMessage={emptyMessage}
            emptyHint={emptyHint}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import type { FocusSessionActivity } from "@/types";
import { formatDurationShort, dateKey, dayLabel } from "@/lib/time";

interface SessionGridProps {
  activities: FocusSessionActivity[];
}

export function SessionGrid({ activities }: SessionGridProps) {
  if (activities.length === 0) {
    return (
      <div className="card rounded-cozy px-5 py-8 text-center">
        <p className="text-brown">No sessions yet.</p>
        <p className="mt-2 text-sm text-brown-muted">
          Complete focus sessions to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {activities.map((activity) => {
        const isRedundant =
          activity.title?.toLowerCase() === activity.category?.toLowerCase() ||
          activity.title === "Focus Session";
        
        const displayTitle = isRedundant 
          ? activity.category || "Focus Session"
          : activity.title || activity.category || "Untitled Session";

        return (
          <article
            key={activity.id}
            className="card flex items-center justify-between gap-4 p-4 transition-all duration-cozy hover:shadow-md"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold capitalize text-brown">
                {displayTitle}
              </p>
              {!isRedundant && activity.category && (
                <p className="mt-0.5 text-xs text-brown-muted capitalize">
                  {activity.category}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end text-right">
              <p className="text-sm font-bold text-sage">
                {formatDurationShort(activity.durationMs)}
              </p>
              <p className="text-[11px] font-medium text-brown-muted mt-0.5">
                {dayLabel(dateKey(activity.startedAt))}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

import { useState, useMemo } from "react";
import type { ProfileStats, HeatmapDay, HeatmapGranularity } from "@/types/analytics";
import type { WeeklyRecap } from "@/lib/weekly-recap";
import type { FocusSessionActivity } from "@/types";
import { formatDurationShort, formatTimeRange, getLogicalDateKey, dayLabel } from "@/lib/time";
import { Zap, Flame, Clock, Trophy } from "lucide-react";
import { ActivityHeatmap } from "./activity-heatmap";

interface OverviewTabProps {
  stats: ProfileStats;
  weeklyRecap: WeeklyRecap | null;
  heatmapDays: HeatmapDay[];
  allSessions: FocusSessionActivity[];
  recentSessions: FocusSessionActivity[];
  granularity: HeatmapGranularity;
  onGranularityChange: (g: HeatmapGranularity) => void;
}

export function OverviewTab({
  stats,
  weeklyRecap,
  heatmapDays,
  allSessions,
  recentSessions,
  granularity,
  onGranularityChange,
}: OverviewTabProps) {
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  const selectedDaySessions = useMemo(() => {
    if (!activeDateKey) return [];
    return allSessions.filter(s => getLogicalDateKey(s.startedAt) === activeDateKey).sort((a, b) => b.startedAt - a.startedAt);
  }, [allSessions, activeDateKey]);

  // Compute consistency as percentage of active days in the last 30 days
  const consistencyPercent = Math.min(100, Math.round((stats.totalDaysActive / 30) * 100));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-cozy">
      
      {/* Activity Heatmap & Hero Stats */}
      <ActivityHeatmap
        days={heatmapDays}
        granularity={granularity}
        onGranularityChange={onGranularityChange}
        activeDateKey={activeDateKey}
        onDayClick={setActiveDateKey}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brown-muted mb-1">Total Focus</p>
          <p className="text-xl font-medium text-brown">{formatDurationShort(stats.totalFocusMs)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brown-muted mb-1">Consistency</p>
          <p className="text-xl font-medium text-brown">{consistencyPercent}%</p>
        </div>
      </div>

      {/* Activity Explorer */}
      {activeDateKey && (
        <section className="card p-5 animate-in fade-in slide-in-from-top-2">
          <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
            <h2 className="font-serif text-lg font-medium text-brown">{dayLabel(activeDateKey)}</h2>
            <button onClick={() => setActiveDateKey(null)} className="text-xs font-medium text-brown-muted hover:text-brown">Close</button>
          </div>
          {selectedDaySessions.length > 0 ? (
            <div className="space-y-3">
              {selectedDaySessions.map(session => (
                <div key={session.id} className="flex justify-between items-center group rounded-lg p-2 hover:bg-surface transition-colors">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="truncate font-medium text-brown">
                      {session.title || "Focus Session"}
                    </p>
                    <p className="text-xs text-brown-muted uppercase tracking-wider mt-0.5">
                      {session.category || 'other'} • {formatTimeRange(session.startedAt, session.endedAt)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-sage">
                    {formatDurationShort(session.durationMs)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-brown-muted text-center py-6">No focus sessions recorded on this day.</p>
          )}
        </section>
      )}


      {/* Weekly Recap */}
      {!activeDateKey && weeklyRecap && (
        <section className="card p-5 h-fit">
          <div className="mb-5 flex items-center gap-2 border-b border-border pb-3">
            <Zap className="h-5 w-5 text-terracotta" />
            <h2 className="font-serif text-lg font-medium text-brown">Weekly Recap</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-brown-muted">Focus Time</span>
              <span className="font-medium text-brown">{formatDurationShort(weeklyRecap.totalFocusMs)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-brown-muted">Sessions Completed</span>
              <span className="font-medium text-brown">{weeklyRecap.totalSessions}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-brown-muted">Most Productive Category</span>
              <span className="font-medium capitalize text-brown">{weeklyRecap.mostProductiveCategory || 'None'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-brown-muted">Longest Session</span>
              <span className="font-medium text-brown">{formatDurationShort(weeklyRecap.topSessionMs)}</span>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}

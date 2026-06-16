import { ActivityHeatmap } from "@/components/profile/activity-heatmap";
import { SessionGrid } from "@/components/profile/session-grid";
import { useFocus } from "@/context/focus-app";
import { getNotableActivities } from "@/lib/analytics";
import type { HeatmapDay, HeatmapGranularity } from "@/types/analytics";
import type { FocusSessionActivity } from "@/types";
import { useMemo } from "react";

interface ActivityTabProps {
  heatmapDays: HeatmapDay[];
  granularity: HeatmapGranularity;
  onGranularityChange: (g: HeatmapGranularity) => void;
}

export function ActivityTab({ heatmapDays, granularity, onGranularityChange }: ActivityTabProps) {
  const { activities } = useFocus();
  
  const notableActivities = useMemo(() => {
    const focusSessions = activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
    return getNotableActivities(focusSessions, 8);
  }, [activities]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 space-y-6 duration-cozy">
      <ActivityHeatmap
        days={heatmapDays}
        granularity={granularity}
        onGranularityChange={onGranularityChange}
      />

      {notableActivities.length > 0 && (
        <div>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-base font-medium text-brown">Top Sessions</h2>
            <span className="text-sm text-brown-muted">Longest focus times</span>
          </div>
          <SessionGrid activities={notableActivities} />
        </div>
      )}
    </div>
  );
}

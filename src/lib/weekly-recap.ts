import type { Activity, FocusSessionActivity } from "@/types";

export interface WeeklyRecap {
  weekStart: number;
  weekEnd: number;
  totalFocusMs: number;
  totalSessions: number;
  mostProductiveCategory: string | null;
  topSessionMs: number;
}

export function generateWeeklyRecap(activities: Activity[]): WeeklyRecap | null {
  const focusSessions = activities.filter((a): a is FocusSessionActivity => a.type === 'focus_session');
  
  if (focusSessions.length === 0) return null;

  // For this prototype, we'll just generate a recap for the "last 7 days" relative to now.
  // In a real system, this would be locked to a specific calendar week.
  
  const now = new Date();
  const weekEnd = now.getTime();
  const weekStart = weekEnd - (7 * 24 * 60 * 60 * 1000);

  const thisWeekSessions = focusSessions.filter(s => s.startedAt >= weekStart && s.startedAt <= weekEnd);

  if (thisWeekSessions.length === 0) return null;

  let totalFocusMs = 0;
  let topSessionMs = 0;
  const categoryCounts = new Map<string, number>();

  for (const session of thisWeekSessions) {
    totalFocusMs += session.durationMs;
    if (session.durationMs > topSessionMs) {
      topSessionMs = session.durationMs;
    }
    const cat = session.category || 'other';
    categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + session.durationMs);
  }

  let mostProductiveCategory = null;
  let maxCatMs = 0;
  for (const [cat, ms] of Array.from(categoryCounts.entries())) {
    if (ms > maxCatMs) {
      maxCatMs = ms;
      mostProductiveCategory = cat;
    }
  }

  return {
    weekStart,
    weekEnd,
    totalFocusMs,
    totalSessions: thisWeekSessions.length,
    mostProductiveCategory,
    topSessionMs,
  };
}

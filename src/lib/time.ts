import type { FocusSessionActivity, DayGroup } from "@/types";

export function computeElapsedMs(
  startedAt: number,
  accumulatedMs: number,
  isPaused: boolean
): number {
  if (isPaused) return accumulatedMs;
  return accumulatedMs + (Date.now() - startedAt);
}

export function formatDuration(ms: number): string {
  if (isNaN(ms) || ms < 0) ms = 0;
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const cs = Math.floor(Math.abs(ms) % 1000 / 10);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":") + ":" + String(cs).padStart(2, "0");
}

export function formatFocusClock(ms: number, showMs: boolean = true): string {
  if (isNaN(ms) || ms < 0) ms = 0;
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const cs = Math.floor(Math.abs(ms) % 1000 / 10);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  
  let base = "";
  if (h > 0) {
    base = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  } else {
    base = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  
  if (showMs) {
    return `${base}:${String(cs).padStart(2, "0")}`;
  }
  return base;
}

export function formatClock(ms: number): string {
  return formatFocusClock(ms);
}

export function formatTimeRange(startMs: number, endMs: number): string {
  const fmt = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${fmt(startMs)} – ${fmt(endMs)}`;
}

export function formatDurationShort(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0 && m > 0) return `${h} hr ${m} min`;
  if (h > 0) return `${h} hr`;
  if (m > 0) return `${m} min`;
  return "< 1 min";
}

export function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const WORKDAY_OFFSET_MS = 4 * 60 * 60 * 1000; // 4 AM boundary

export function getLogicalDateKey(ts: number): string {
  return dateKey(ts - WORKDAY_OFFSET_MS);
}

export function dayLabel(key: string): string {
  const today = getLogicalDateKey(Date.now());
  const yesterday = getLogicalDateKey(Date.now() - 86400000);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  
  const [y, m, d] = key.split("-").map(Number);
  const keyDate = new Date(y, m - 1, d);
  
  return keyDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function isToday(ts: number): boolean {
  return getLogicalDateKey(ts) === getLogicalDateKey(Date.now());
}

export function groupActivitiesByDay(activities: FocusSessionActivity[]): DayGroup[] {
  const map = new Map<string, FocusSessionActivity[]>();
  for (const a of activities) {
    const key = getLogicalDateKey(a.startedAt);
    const list = map.get(key) ?? [];
    list.push(a);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKeyVal, dayActivities]) => {
      const sorted = dayActivities.sort((a, b) => b.startedAt - a.startedAt);
      return {
        dateKey: dateKeyVal,
        label: dayLabel(dateKeyVal),
        activities: sorted,
        totalMs: sorted.reduce((sum, x) => sum + x.durationMs, 0),
      };
    });
}

export function todayActivities(activities: FocusSessionActivity[]): FocusSessionActivity[] {
  return activities
    .filter((a) => isToday(a.startedAt))
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function todayTotalMs(activities: FocusSessionActivity[]): number {
  return todayActivities(activities).reduce((sum, a) => sum + a.durationMs, 0);
}

export function historyDays(activities: FocusSessionActivity[]): DayGroup[] {
  const today = getLogicalDateKey(Date.now());
  return groupActivitiesByDay(activities).filter((g) => g.dateKey !== today);
}

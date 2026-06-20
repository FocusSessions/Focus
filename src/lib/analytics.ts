import type { FocusSessionActivity } from "@/types";
import type {
  ProfileStats,
  HeatmapDay,
  HeatmapGranularity,
  ChartDataPoint,
} from "@/types/analytics";
import { dateKey, getLogicalDateKey } from "@/lib/time";

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function addDays(key: string, n: number): string {
  const d = parseDateKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d.getTime());
}

export function computeStats(activities: FocusSessionActivity[]): ProfileStats {
  if (activities.length === 0) {
    return {
      totalFocusMs: 0,
      totalSessions: 0,
      averageSessionMs: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      focusedToday: false,
    };
  }

  const totalFocusMs = activities.reduce((sum, a) => sum + a.durationMs, 0);
  const totalSessions = activities.length;
  const averageSessionMs = totalFocusMs / totalSessions;

  const daySet = new Set(activities.map((a) => getLogicalDateKey(a.startedAt)));
  const sortedDays = Array.from(daySet).sort().reverse();
  const today = getLogicalDateKey(Date.now());
  const yesterday = addDays(today, -1);

  let longest = 0;
  let run = 0;
  let prevKey: string | null = null;
  const asc = [...sortedDays].reverse();
  for (const dk of asc) {
    if (prevKey && addDays(prevKey, 1) === dk) {
      run++;
    } else {
      run = 1;
    }
    longest = Math.max(longest, run);
    prevKey = dk;
  }

  let current = 0;
  const validDays = sortedDays.filter(dk => dk <= today);
  let cursor =
    validDays[0] === today
      ? today
      : validDays[0] === yesterday
        ? yesterday
        : null;
  if (cursor) {
    for (const dk of validDays) {
      if (dk === cursor) {
        current++;
        cursor = addDays(cursor, -1);
      } else if (dk < cursor) {
        break;
      }
    }
  }

  return {
    totalFocusMs,
    totalSessions,
    averageSessionMs,
    currentStreak: current,
    longestStreak: longest,
    totalDaysActive: daySet.size,
    focusedToday: daySet.has(today),
  };
}

function msToLevel(ms: number): 0 | 1 | 2 | 3 | 4 {
  if (ms <= 0) return 0;
  if (ms < 30 * 60 * 1000) return 1;
  if (ms < 60 * 60 * 1000) return 2;
  if (ms < 120 * 60 * 1000) return 3;
  return 4;
}

export function buildHeatmapData(
  activities: FocusSessionActivity[],
  granularity: HeatmapGranularity,
  joinedAt?: number
): HeatmapDay[] {
  const today = getLogicalDateKey(Date.now());

  let maxDays: number;
  if (granularity === "month") maxDays = 31;
  else if (granularity === "quarter") maxDays = 91;
  else maxDays = 365;

  let rangeDays = maxDays;

  const dayMap = new Map<string, { totalMs: number; sessionsCount: number; categories: Set<string>; longestSessionMs: number }>();
  
  for (const a of activities) {
    const dk = getLogicalDateKey(a.startedAt);
    const existing = dayMap.get(dk) || { totalMs: 0, sessionsCount: 0, categories: new Set(), longestSessionMs: 0 };
    existing.totalMs += a.durationMs;
    existing.sessionsCount += 1;
    existing.longestSessionMs = Math.max(existing.longestSessionMs, a.durationMs);
    if (a.category) existing.categories.add(a.category);
    dayMap.set(dk, existing);
  }

  const days: HeatmapDay[] = [];
  const startDate = addDays(today, -(rangeDays - 1));
  for (let i = 0; i < rangeDays; i++) {
    const dk = addDays(startDate, i);
    const data = dayMap.get(dk) || { totalMs: 0, sessionsCount: 0, categories: new Set(), longestSessionMs: 0 };
    
    const isJoinedDate = joinedAt ? dk === dateKey(joinedAt) : false;
    
    days.push({
      dateKey: dk,
      totalMs: data.totalMs,
      level: isJoinedDate ? Math.max(1, msToLevel(data.totalMs)) as 0|1|2|3|4 : msToLevel(data.totalMs),
      sessionsCount: data.sessionsCount,
      categories: Array.from(data.categories),
      longestSessionMs: data.longestSessionMs,
      isJoinedDate,
    });
  }

  return days;
}

export function buildWeeklyChartData(activities: FocusSessionActivity[]): ChartDataPoint[] {
  const today = getLogicalDateKey(Date.now());
  const dayMap = new Map<string, number>();
  for (const a of activities) {
    const dk = getLogicalDateKey(a.startedAt);
    dayMap.set(dk, (dayMap.get(dk) ?? 0) + a.durationMs);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const points: ChartDataPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const dk = addDays(today, -i);
    const d = parseDateKey(dk);
    points.push({
      label: dayNames[d.getDay()],
      hours: Math.round(((dayMap.get(dk) ?? 0) / 3_600_000) * 100) / 100,
      totalMs: dayMap.get(dk) ?? 0,
      dateKey: dk,
    });
  }
  return points;
}

export function buildMonthlyChartData(activities: FocusSessionActivity[]): ChartDataPoint[] {
  const today = getLogicalDateKey(Date.now());
  const dayMap = new Map<string, number>();
  for (const a of activities) {
    const dk = getLogicalDateKey(a.startedAt);
    dayMap.set(dk, (dayMap.get(dk) ?? 0) + a.durationMs);
  }

  const points: ChartDataPoint[] = [];
  const numWeeks = 5;
  const fmtShort = (dt: Date) =>
    `${dt.toLocaleDateString(undefined, { month: "short" })} ${dt.getDate()}`;

  for (let w = numWeeks - 1; w >= 0; w--) {
    const weekEnd = addDays(today, -(w * 7));
    const weekStart = addDays(weekEnd, -6);
    let totalMs = 0;
    for (let d = 0; d < 7; d++) {
      const dk = addDays(weekStart, d);
      totalMs += dayMap.get(dk) ?? 0;
    }
    const startD = parseDateKey(weekStart);
    const endD = parseDateKey(weekEnd);
    points.push({
      label: `${fmtShort(startD)}-${fmtShort(endD)}`,
      hours: Math.round((totalMs / 3_600_000) * 100) / 100,
      totalMs: totalMs,
      dateKey: weekStart,
    });
  }
  return points;
}

export function getNotableActivities(
  activities: FocusSessionActivity[],
  limit: number = 12
): FocusSessionActivity[] {
  return [...activities]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, limit);
}

export const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"] as const;

export const HEATMAP_WEEKS = 53;

export function padHeatmapGrid(
  grid: (HeatmapDay | null)[][],
  targetWeeks: number = HEATMAP_WEEKS
): (HeatmapDay | null)[][] {
  const padded = grid.length > targetWeeks ? grid.slice(-targetWeeks) : [...grid];
  while (padded.length < targetWeeks) {
    padded.unshift(Array(7).fill(null));
  }
  return padded;
}

export function toHeatmapGrid(
  days: HeatmapDay[]
): (HeatmapDay | null)[][] {
  if (days.length === 0) return [];

  const firstDate = parseDateKey(days[0].dateKey);
  const firstDow = firstDate.getDay();
  const mondayOffset = firstDow === 0 ? 6 : firstDow - 1;

  const grid: (HeatmapDay | null)[][] = [];
  let currentWeek: (HeatmapDay | null)[] = [];

  for (let i = 0; i < mondayOffset; i++) {
    currentWeek.push(null);
  }

  for (const day of days) {
    const d = parseDateKey(day.dateKey);
    const dow = d.getDay();
    const mondayBased = dow === 0 ? 6 : dow - 1;

    if (mondayBased === 0 && currentWeek.some((c) => c !== null)) {
      grid.push(currentWeek);
      currentWeek = [];
    }
    currentWeek.push(day);
  }

  while (currentWeek.length < 7) currentWeek.push(null);
  grid.push(currentWeek);

  return grid;
}

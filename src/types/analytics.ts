export interface HeatmapDay {
  dateKey: string;
  totalMs: number;
  level: 0 | 1 | 2 | 3 | 4;
  sessionsCount: number;
  categories: string[];
  longestSessionMs: number;
  isJoinedDate?: boolean;
}

export type HeatmapGranularity = "month" | "quarter" | "year";

export interface ProfileStats {
  totalFocusMs: number;
  totalSessions: number;
  averageSessionMs: number;
  currentStreak: number;
  longestStreak: number;
  totalDaysActive: number;
  focusedToday: boolean;
}

export interface ChartDataPoint {
  label: string;
  hours: number;
  totalMs: number;
  dateKey: string;
}

export type ProfileViewMode = "heatmap" | "charts";

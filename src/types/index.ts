export type SessionCategory = string;

export type SessionVisibility = 'private' | 'friends' | 'public';

export interface BaseActivity {
  id: string;
  type: string;
  createdAt: number;
}

export interface FocusSessionActivity extends BaseActivity {
  type: 'focus_session';
  title: string;
  description?: string;
  durationMs: number;
  category: SessionCategory;
  visibility: SessionVisibility;
  startedAt: number;
  endedAt: number;
  timezoneOffset?: number;
}

export type Activity = FocusSessionActivity; // Extend this union with other activity types later

export interface ActiveTimer {
  startedAt: number;
  accumulatedMs: number;
  isPaused: boolean;
  pausedAt: number | null;
  label: string;
}

export interface MusicSettings {
  volume: number;
  loop: boolean;
  lastTrackId: string | null;
}

export interface UserPreferences {
  dailyGoalMinutes: number;
  sessionGoalMinutes: number;
  showMilliseconds: boolean;
  timerDirection?: 'up' | 'down';
  joinedAt?: number;
}

export const DEFAULT_DAILY_GOAL_MINUTES = 240;
export const DEFAULT_SESSION_GOAL_MINUTES = 25;

export interface UploadedTrack {
  id: string;
  name: string;
  mimeType: string;
  createdAt: number;
}

export interface BundledTrack {
  id: string;
  name: string;
  src: string;
}

export interface DayGroup {
  dateKey: string;
  label: string;
  activities: FocusSessionActivity[];
  totalMs: number;
}

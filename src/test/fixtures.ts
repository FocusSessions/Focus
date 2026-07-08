import type { FocusSessionActivity, Activity, UserPreferences } from '@/types';

// ---------------------------------------------------------------------------
// Factory helpers — build test data with sensible defaults, override anything
// ---------------------------------------------------------------------------

let _idCounter = 0;

/**
 * Creates a FocusSessionActivity with all required fields populated.
 * Override any field via the `overrides` parameter.
 */
export function createSession(
  overrides: Partial<FocusSessionActivity> = {}
): FocusSessionActivity {
  _idCounter++;
  const now = Date.now();
  const durationMs = overrides.durationMs ?? 25 * 60 * 1000; // 25 min default

  return {
    id: `test-session-${_idCounter}`,
    type: 'focus_session',
    title: `Test Session ${_idCounter}`,
    durationMs,
    category: 'study',
    visibility: 'private',
    startedAt: overrides.startedAt ?? now - durationMs,
    endedAt: overrides.endedAt ?? now,
    createdAt: overrides.createdAt ?? now,
    timezoneOffset: undefined,
    ...overrides,
  };
}

/**
 * Creates N sessions spread over the given number of days, starting from today
 * and going backwards. Useful for testing streak / consistency logic.
 */
export function createSessionsOverDays(
  dayCount: number,
  sessionsPerDay: number = 1,
  baseDurationMs: number = 30 * 60 * 1000
): FocusSessionActivity[] {
  const sessions: FocusSessionActivity[] = [];
  const now = Date.now();

  for (let d = 0; d < dayCount; d++) {
    for (let s = 0; s < sessionsPerDay; s++) {
      const dayOffset = d * 24 * 60 * 60 * 1000;
      const startedAt = now - dayOffset - baseDurationMs - s * 60 * 60 * 1000;

      sessions.push(
        createSession({
          startedAt,
          endedAt: startedAt + baseDurationMs,
          durationMs: baseDurationMs,
          createdAt: startedAt,
        })
      );
    }
  }

  return sessions;
}

/**
 * Creates a session that started at a specific hour today.
 * Useful for testing the 4 AM logical-day boundary.
 */
export function createSessionAtHour(
  hour: number,
  durationMinutes: number = 25
): FocusSessionActivity {
  const today = new Date();
  today.setHours(hour, 0, 0, 0);
  const startedAt = today.getTime();
  const durationMs = durationMinutes * 60 * 1000;

  return createSession({
    startedAt,
    endedAt: startedAt + durationMs,
    durationMs,
    createdAt: startedAt,
  });
}

/**
 * Creates default user preferences. Override any field.
 */
export function createPreferences(
  overrides: Partial<UserPreferences> = {}
): UserPreferences {
  return {
    dailyGoalMinutes: 240,
    sessionGoalMinutes: 25,
    showMilliseconds: true,
    timerDirection: 'up',
    joinedAt: Date.now() - 90 * 24 * 60 * 60 * 1000, // 90 days ago
    customCategories: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Reset counter between test files (call in beforeEach if needed)
// ---------------------------------------------------------------------------

export function resetFixtures(): void {
  _idCounter = 0;
}

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  computeElapsedMs,
  formatDuration,
  formatFocusClock,
  formatDurationShort,
  formatTimeRange,
  dateKey,
  getLogicalDateKey,
  WORKDAY_OFFSET_MS,
  dayLabel,
  isToday,
  groupActivitiesByDay,
  todayActivities,
  todayTotalMs,
  historyDays,
} from '@/lib/time';
import { createSession, createSessionAtHour, resetFixtures } from '@/test/fixtures';

describe('computeElapsedMs', () => {
  it('returns accumulated when paused', () => {
    expect(computeElapsedMs(Date.now() - 5000, 3000, true)).toBe(3000);
  });

  it('adds live elapsed when not paused', () => {
    const now = Date.now();
    const result = computeElapsedMs(now - 5000, 2000, false);
    // Should be ~7000ms (2000 accumulated + 5000 live)
    expect(result).toBeGreaterThanOrEqual(6900);
    expect(result).toBeLessThanOrEqual(7200);
  });
});

describe('formatDuration', () => {
  it('formats zero', () => {
    expect(formatDuration(0)).toBe('00:00:00:00');
  });

  it('formats negative as zero', () => {
    expect(formatDuration(-100)).toBe('00:00:00:00');
  });

  it('formats NaN as zero', () => {
    expect(formatDuration(NaN)).toBe('00:00:00:00');
  });

  it('formats 1 hour 23 minutes 45 seconds', () => {
    const ms = (1 * 3600 + 23 * 60 + 45) * 1000;
    expect(formatDuration(ms)).toBe('01:23:45:00');
  });

  it('includes centiseconds', () => {
    const ms = 1500; // 1.5 seconds = 01:50cs
    expect(formatDuration(ms)).toBe('00:00:01:50');
  });
});

describe('formatFocusClock', () => {
  it('omits hours when under 1 hour', () => {
    const ms = 5 * 60 * 1000; // 5 minutes
    expect(formatFocusClock(ms)).toBe('05:00:00');
  });

  it('includes hours when 1+ hour', () => {
    const ms = 90 * 60 * 1000; // 1h 30m
    expect(formatFocusClock(ms)).toBe('01:30:00:00');
  });

  it('hides centiseconds when showMs is false', () => {
    const ms = 5 * 60 * 1000 + 30 * 1000; // 5:30
    expect(formatFocusClock(ms, false)).toBe('05:30');
  });

  it('handles NaN safely', () => {
    expect(formatFocusClock(NaN)).toBe('00:00:00');
  });
});

describe('formatDurationShort', () => {
  it('shows hours and minutes', () => {
    expect(formatDurationShort(90 * 60000)).toBe('1 hr 30 min');
  });

  it('shows hours only when no remainder', () => {
    expect(formatDurationShort(120 * 60000)).toBe('2 hr');
  });

  it('shows minutes only when under 1 hour', () => {
    expect(formatDurationShort(45 * 60000)).toBe('45 min');
  });

  it('shows "0 min" for exactly 0', () => {
    expect(formatDurationShort(0)).toBe('0 min');
  });

  it('shows "< 1 min" for sub-minute durations', () => {
    expect(formatDurationShort(30000)).toBe('< 1 min');
  });
});

describe('dateKey', () => {
  it('produces YYYY-MM-DD format', () => {
    const ts = new Date(2025, 5, 15).getTime(); // June 15, 2025
    expect(dateKey(ts)).toBe('2025-06-15');
  });

  it('pads single-digit months and days', () => {
    const ts = new Date(2025, 0, 5).getTime(); // Jan 5, 2025
    expect(dateKey(ts)).toBe('2025-01-05');
  });
});

describe('getLogicalDateKey (4AM boundary)', () => {
  it('WORKDAY_OFFSET_MS is 4 hours', () => {
    expect(WORKDAY_OFFSET_MS).toBe(4 * 60 * 60 * 1000);
  });

  it('session at 3AM belongs to the previous logical day', () => {
    const at3AM = new Date();
    at3AM.setHours(3, 0, 0, 0);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expectedKey = dateKey(yesterday.getTime());

    expect(getLogicalDateKey(at3AM.getTime())).toBe(expectedKey);
  });

  it('session at 5AM belongs to the current day', () => {
    const at5AM = new Date();
    at5AM.setHours(5, 0, 0, 0);
    const todayKey = dateKey(new Date().getTime());

    // At 5AM, after subtracting 4h offset, we get 1AM same day
    expect(getLogicalDateKey(at5AM.getTime())).toBe(todayKey);
  });
});

describe('dayLabel', () => {
  it('returns "Today" for today\'s key', () => {
    const todayKey = getLogicalDateKey(Date.now());
    expect(dayLabel(todayKey)).toBe('Today');
  });

  it('returns "Yesterday" for yesterday\'s key', () => {
    const yesterdayKey = getLogicalDateKey(Date.now() - 86400000);
    expect(dayLabel(yesterdayKey)).toBe('Yesterday');
  });

  it('returns a formatted date for older days', () => {
    const oldKey = '2024-01-15';
    const label = dayLabel(oldKey);
    // Should contain month and day number
    expect(label).toContain('15');
  });
});

describe('isToday', () => {
  it('returns true for a timestamp within today', () => {
    expect(isToday(Date.now())).toBe(true);
  });

  it('returns false for a timestamp from 2 days ago', () => {
    expect(isToday(Date.now() - 2 * 86400000)).toBe(false);
  });
});

describe('groupActivitiesByDay', () => {
  beforeEach(() => resetFixtures());

  it('returns empty array for no activities', () => {
    expect(groupActivitiesByDay([])).toEqual([]);
  });

  it('groups sessions by logical day', () => {
    // Two sessions today, one from yesterday
    const now = Date.now();
    const sessions = [
      createSession({ startedAt: now - 1000, endedAt: now }),
      createSession({ startedAt: now - 60000, endedAt: now - 59000 }),
      createSession({
        startedAt: now - 86400000 - 1000,
        endedAt: now - 86400000,
      }),
    ];

    const groups = groupActivitiesByDay(sessions);
    expect(groups.length).toBeGreaterThanOrEqual(2);
  });

  it('calculates totalMs per day', () => {
    const now = Date.now();
    const sessions = [
      createSession({ startedAt: now - 60000, endedAt: now, durationMs: 30000 }),
      createSession({ startedAt: now - 120000, endedAt: now - 60000, durationMs: 20000 }),
    ];

    const groups = groupActivitiesByDay(sessions);
    const todayGroup = groups[0];
    expect(todayGroup.totalMs).toBe(50000);
  });

  it('sorts days in reverse chronological order', () => {
    const now = Date.now();
    const sessions = [
      createSession({ startedAt: now - 3 * 86400000 }),
      createSession({ startedAt: now }),
    ];

    const groups = groupActivitiesByDay(sessions);
    expect(groups[0].dateKey > groups[groups.length - 1].dateKey).toBe(true);
  });
});

describe('todayActivities / todayTotalMs', () => {
  beforeEach(() => resetFixtures());

  it('filters only today\'s sessions', () => {
    const now = Date.now();
    const sessions = [
      createSession({ startedAt: now - 1000 }),
      createSession({ startedAt: now - 3 * 86400000 }),
    ];

    const today = todayActivities(sessions);
    expect(today).toHaveLength(1);
  });

  it('sums today\'s durations', () => {
    const now = Date.now();
    const sessions = [
      createSession({ startedAt: now - 1000, durationMs: 10000 }),
      createSession({ startedAt: now - 2000, durationMs: 20000 }),
    ];

    expect(todayTotalMs(sessions)).toBe(30000);
  });
});

describe('historyDays', () => {
  beforeEach(() => resetFixtures());

  it('excludes today from history', () => {
    const now = Date.now();
    const sessions = [
      createSession({ startedAt: now }),
      createSession({ startedAt: now - 86400000 }),
    ];

    const history = historyDays(sessions);
    const todayKey = getLogicalDateKey(now);
    const hasToday = history.some((g) => g.dateKey === todayKey);
    expect(hasToday).toBe(false);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeStats,
  buildHeatmapData,
  buildWeeklyChartData,
  buildMonthlyChartData,
  toHeatmapGrid,
  padHeatmapGrid,
  HEATMAP_WEEKS,
  getNotableActivities,
} from '@/lib/analytics';
import { createSession, createSessionsOverDays, resetFixtures } from '@/test/fixtures';

describe('computeStats', () => {
  beforeEach(() => resetFixtures());

  it('returns zeros for empty array', () => {
    const stats = computeStats([]);
    expect(stats).toEqual({
      totalFocusMs: 0,
      totalSessions: 0,
      averageSessionMs: 0,
      currentStreak: 0,
      longestStreak: 0,
      totalDaysActive: 0,
      focusedToday: false,
    });
  });

  it('calculates totals for a single session', () => {
    const session = createSession({ durationMs: 60000 });
    const stats = computeStats([session]);
    expect(stats.totalFocusMs).toBe(60000);
    expect(stats.totalSessions).toBe(1);
    expect(stats.averageSessionMs).toBe(60000);
  });

  it('calculates average correctly', () => {
    const sessions = [
      createSession({ durationMs: 10000 }),
      createSession({ durationMs: 30000 }),
    ];
    const stats = computeStats(sessions);
    expect(stats.averageSessionMs).toBe(20000);
  });

  it('counts total active days', () => {
    const sessions = createSessionsOverDays(5, 2);
    const stats = computeStats(sessions);
    expect(stats.totalDaysActive).toBeGreaterThanOrEqual(5);
  });

  it('detects focusedToday when there is a session today', () => {
    const session = createSession({ startedAt: Date.now() - 1000 });
    const stats = computeStats([session]);
    expect(stats.focusedToday).toBe(true);
  });

  it('focusedToday is false with only old sessions', () => {
    const session = createSession({
      startedAt: Date.now() - 5 * 86400000,
    });
    const stats = computeStats([session]);
    expect(stats.focusedToday).toBe(false);
  });

  it('computes current streak for consecutive days', () => {
    const sessions = createSessionsOverDays(7);
    const stats = computeStats(sessions);
    expect(stats.currentStreak).toBeGreaterThanOrEqual(7);
  });

  it('longest streak is >= current streak', () => {
    const sessions = createSessionsOverDays(10);
    const stats = computeStats(sessions);
    expect(stats.longestStreak).toBeGreaterThanOrEqual(stats.currentStreak);
  });
});

describe('buildHeatmapData', () => {
  beforeEach(() => resetFixtures());

  it('returns 31 days for month granularity', () => {
    const days = buildHeatmapData([], 'month');
    expect(days).toHaveLength(31);
  });

  it('returns 91 days for quarter granularity', () => {
    const days = buildHeatmapData([], 'quarter');
    expect(days).toHaveLength(91);
  });

  it('returns 365 days for year granularity', () => {
    const days = buildHeatmapData([], 'year');
    expect(days).toHaveLength(365);
  });

  it('assigns correct levels based on duration thresholds', () => {
    const now = Date.now();
    // Create a session with 45 min today → should be level 2 (30-60 min)
    const sessions = [
      createSession({
        startedAt: now - 45 * 60000,
        endedAt: now,
        durationMs: 45 * 60000,
      }),
    ];

    const days = buildHeatmapData(sessions, 'month');
    const todayDay = days[days.length - 1]; // Last day should be today
    expect(todayDay.level).toBeGreaterThanOrEqual(2);
  });

  it('marks joined date', () => {
    const joinedAt = Date.now() - 10 * 86400000;
    const days = buildHeatmapData([], 'month', joinedAt);
    const joinedDay = days.find((d) => d.isJoinedDate);
    expect(joinedDay).toBeDefined();
  });

  it('every day has required shape', () => {
    const days = buildHeatmapData([], 'month');
    for (const day of days) {
      expect(day).toHaveProperty('dateKey');
      expect(day).toHaveProperty('totalMs');
      expect(day).toHaveProperty('level');
      expect(day).toHaveProperty('sessionsCount');
      expect(day).toHaveProperty('categories');
      expect([0, 1, 2, 3, 4]).toContain(day.level);
    }
  });
});

describe('buildWeeklyChartData', () => {
  beforeEach(() => resetFixtures());

  it('returns exactly 7 data points', () => {
    const points = buildWeeklyChartData([]);
    expect(points).toHaveLength(7);
  });

  it('every point has label, hours, totalMs, dateKey', () => {
    const points = buildWeeklyChartData([]);
    for (const p of points) {
      expect(p.label).toBeTruthy();
      expect(typeof p.hours).toBe('number');
      expect(typeof p.totalMs).toBe('number');
      expect(p.dateKey).toBeTruthy();
    }
  });

  it('aggregates session durations into the correct day', () => {
    const now = Date.now();
    const session = createSession({
      startedAt: now - 60000,
      endedAt: now,
      durationMs: 60 * 60000, // 1 hour
    });

    const points = buildWeeklyChartData([session]);
    const todayPoint = points[points.length - 1];
    expect(todayPoint.hours).toBeGreaterThan(0);
  });
});

describe('buildMonthlyChartData', () => {
  it('returns exactly 5 data points (weekly buckets)', () => {
    const points = buildMonthlyChartData([]);
    expect(points).toHaveLength(5);
  });

  it('every point has a label with date range', () => {
    const points = buildMonthlyChartData([]);
    for (const p of points) {
      expect(p.label).toContain('-');
    }
  });
});

describe('getNotableActivities', () => {
  beforeEach(() => resetFixtures());

  it('returns top N sessions sorted by duration', () => {
    const sessions = [
      createSession({ durationMs: 10000 }),
      createSession({ durationMs: 50000 }),
      createSession({ durationMs: 30000 }),
    ];

    const notable = getNotableActivities(sessions, 2);
    expect(notable).toHaveLength(2);
    expect(notable[0].durationMs).toBe(50000);
    expect(notable[1].durationMs).toBe(30000);
  });

  it('defaults to limit of 12', () => {
    const sessions = Array.from({ length: 20 }, () => createSession());
    const notable = getNotableActivities(sessions);
    expect(notable).toHaveLength(12);
  });
});

describe('toHeatmapGrid', () => {
  it('returns empty array for no days', () => {
    expect(toHeatmapGrid([])).toEqual([]);
  });

  it('creates weeks with 7 columns', () => {
    const days = buildHeatmapData([], 'month');
    const grid = toHeatmapGrid(days);
    for (const week of grid) {
      expect(week).toHaveLength(7);
    }
  });
});

describe('padHeatmapGrid', () => {
  it('pads grid to target width', () => {
    const grid = [Array(7).fill(null)];
    const padded = padHeatmapGrid(grid, HEATMAP_WEEKS);
    expect(padded).toHaveLength(HEATMAP_WEEKS);
  });

  it('HEATMAP_WEEKS is 53', () => {
    expect(HEATMAP_WEEKS).toBe(53);
  });
});

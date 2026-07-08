import { describe, it, expect, beforeEach } from 'vitest';
import { generateWeeklyRecap } from '@/lib/weekly-recap';
import { createSession, createSessionsOverDays, resetFixtures } from '@/test/fixtures';

describe('generateWeeklyRecap', () => {
  beforeEach(() => resetFixtures());

  it('returns null for empty activities', () => {
    expect(generateWeeklyRecap([])).toBeNull();
  });

  it('returns null when all sessions are older than 7 days', () => {
    const oldSession = createSession({
      startedAt: Date.now() - 14 * 86400000,
      endedAt: Date.now() - 14 * 86400000 + 3600000,
      durationMs: 3600000,
    });
    expect(generateWeeklyRecap([oldSession])).toBeNull();
  });

  it('calculates totalFocusMs for sessions in the last 7 days', () => {
    const sessions = createSessionsOverDays(5, 1, 30 * 60000); // 5 days, 30min each
    const recap = generateWeeklyRecap(sessions);

    expect(recap).not.toBeNull();
    expect(recap!.totalFocusMs).toBe(5 * 30 * 60000);
  });

  it('counts only sessions within the 7-day window', () => {
    const recent = createSession({
      startedAt: Date.now() - 86400000,
      endedAt: Date.now() - 86400000 + 60 * 60000,
      durationMs: 60 * 60000,
    });
    const old = createSession({
      startedAt: Date.now() - 10 * 86400000,
      endedAt: Date.now() - 10 * 86400000 + 60 * 60000,
      durationMs: 60 * 60000,
    });

    const recap = generateWeeklyRecap([recent, old]);
    expect(recap).not.toBeNull();
    expect(recap!.totalSessions).toBe(1);
    expect(recap!.totalFocusMs).toBe(60 * 60000);
  });

  it('identifies the most productive category', () => {
    const sessions = [
      createSession({
        startedAt: Date.now() - 1000,
        durationMs: 120 * 60000,
        category: 'coding',
      }),
      createSession({
        startedAt: Date.now() - 2000,
        durationMs: 30 * 60000,
        category: 'reading',
      }),
      createSession({
        startedAt: Date.now() - 3000,
        durationMs: 60 * 60000,
        category: 'coding',
      }),
    ];

    const recap = generateWeeklyRecap(sessions);
    expect(recap).not.toBeNull();
    expect(recap!.mostProductiveCategory).toBe('coding');
  });

  it('picks the longest session as topSessionMs', () => {
    const sessions = [
      createSession({ startedAt: Date.now() - 1000, durationMs: 10000 }),
      createSession({ startedAt: Date.now() - 2000, durationMs: 50000 }),
      createSession({ startedAt: Date.now() - 3000, durationMs: 25000 }),
    ];

    const recap = generateWeeklyRecap(sessions);
    expect(recap!.topSessionMs).toBe(50000);
  });

  it('sets weekStart and weekEnd within 7 days of each other', () => {
    const sessions = createSessionsOverDays(3);
    const recap = generateWeeklyRecap(sessions);
    expect(recap).not.toBeNull();
    expect(recap!.weekEnd - recap!.weekStart).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('defaults category to "other" when session has no category', () => {
    const session = createSession({
      startedAt: Date.now() - 1000,
      durationMs: 60000,
      category: '',
    });

    const recap = generateWeeklyRecap([session]);
    expect(recap).not.toBeNull();
    // Empty string category should be treated as 'other' by the implementation
    // Note: current impl checks `session.category || 'other'`, and '' is falsy
    expect(recap!.mostProductiveCategory).toBe('other');
  });
});

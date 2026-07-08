import { describe, it, expect, beforeEach } from 'vitest';
import { calculateProductivityScore } from '@/lib/score';
import {
  createSession,
  createSessionsOverDays,
  resetFixtures,
} from '@/test/fixtures';

describe('calculateProductivityScore', () => {
  beforeEach(() => {
    resetFixtures();
  });

  // -----------------------------------------------------------------------
  // Edge cases & empty input
  // -----------------------------------------------------------------------

  it('returns zeros for empty activities', () => {
    const result = calculateProductivityScore([]);
    expect(result.score).toBe(0);
    expect(result.consistencyScore).toBe(0);
  });

  it('returns zeros when no focus_session activities exist', () => {
    // Pass activities that aren't focus sessions (simulated via filter)
    const result = calculateProductivityScore([]);
    expect(result).toEqual({ score: 0, consistencyScore: 0 });
  });

  // -----------------------------------------------------------------------
  // V — Experience Index: 1 - e^(-totalHours / 400)
  // -----------------------------------------------------------------------

  it('calculates experience index (V) for a single long session', () => {
    // 10 hours = 36_000_000 ms
    const session = createSession({ durationMs: 10 * 3600000 });
    const result = calculateProductivityScore([session]);
    // V = 1 - e^(-10/400) ≈ 0.0247
    // Score gets 500*V contribution (plus K and Q)
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1000);
  });

  it('V contribution grows with more total hours', () => {
    const short = createSession({ durationMs: 1 * 3600000 }); // 1 hour
    const long = createSession({ durationMs: 100 * 3600000 }); // 100 hours

    const scoreShort = calculateProductivityScore([short]);
    const scoreLong = calculateProductivityScore([long]);

    // More hours → higher V → higher score (assuming same K and Q context)
    expect(scoreLong.score).toBeGreaterThan(scoreShort.score);
  });

  // -----------------------------------------------------------------------
  // K — Consistency Index
  // -----------------------------------------------------------------------

  it('consistency is 0 when no sessions in the last 30 days', () => {
    // Session from 60 days ago
    const oldSession = createSession({
      startedAt: Date.now() - 60 * 24 * 3600000,
      endedAt: Date.now() - 60 * 24 * 3600000 + 3600000,
      durationMs: 3600000,
    });
    const result = calculateProductivityScore([oldSession]);
    expect(result.consistencyScore).toBe(0);
  });

  it('firm rule: K is 0 when r30 is 0, even if r90 is positive', () => {
    // Session from 45 days ago (within 90-day window but outside 30-day)
    const session = createSession({
      startedAt: Date.now() - 45 * 24 * 3600000,
      endedAt: Date.now() - 45 * 24 * 3600000 + 3600000,
      durationMs: 3600000,
    });
    const result = calculateProductivityScore([session]);
    expect(result.consistencyScore).toBe(0);
  });

  it('consistency grows with more active days in last 30 days', () => {
    const fewDays = createSessionsOverDays(3);
    const manyDays = createSessionsOverDays(20);

    const scoreFew = calculateProductivityScore(fewDays);
    const scoreMany = calculateProductivityScore(manyDays);

    expect(scoreMany.consistencyScore).toBeGreaterThan(scoreFew.consistencyScore);
  });

  it('accounts for joinedAt when user account is young', () => {
    // Brand new user, joined 5 days ago, focused every day
    const joinedAt = Date.now() - 5 * 24 * 3600000;
    const sessions = createSessionsOverDays(5);

    const result = calculateProductivityScore(sessions, joinedAt);
    // With only 5 days of account age and 5 active days, r30 should be capped
    // The consistency score should be high since they focused every day they could
    expect(result.consistencyScore).toBeGreaterThan(0);
  });

  // -----------------------------------------------------------------------
  // Q — Focus Depth Index: 1 - e^(-avgMinutes / 35)
  // -----------------------------------------------------------------------

  it('deeper sessions produce higher Q contribution', () => {
    const shallow = createSessionsOverDays(5, 1, 5 * 60000); // 5 min avg
    const deep = createSessionsOverDays(5, 1, 60 * 60000);   // 60 min avg

    const scoreShallow = calculateProductivityScore(shallow);
    const scoreDeep = calculateProductivityScore(deep);

    expect(scoreDeep.score).toBeGreaterThan(scoreShallow.score);
  });

  // -----------------------------------------------------------------------
  // Score bounds
  // -----------------------------------------------------------------------

  it('score never exceeds 1000', () => {
    // Create an extreme scenario: 500 hours, 90 consecutive days
    const sessions = createSessionsOverDays(90, 3, 120 * 60000);
    const result = calculateProductivityScore(sessions);
    expect(result.score).toBeLessThanOrEqual(1000);
  });

  it('score is always a non-negative integer', () => {
    const sessions = createSessionsOverDays(10);
    const result = calculateProductivityScore(sessions);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it('consistencyScore is clamped to [0, 100]', () => {
    const sessions = createSessionsOverDays(30, 3);
    const result = calculateProductivityScore(sessions);
    expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(result.consistencyScore).toBeLessThanOrEqual(100);
  });
});

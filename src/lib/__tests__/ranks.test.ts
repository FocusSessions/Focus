import { describe, it, expect } from 'vitest';
import { determineRank, RANKS } from '@/lib/ranks';
import type { RankDef } from '@/lib/ranks';

describe('RANKS constant', () => {
  it('has 6 ranks defined', () => {
    expect(RANKS).toHaveLength(6);
  });

  it('ranks are sorted by ascending threshold', () => {
    for (let i = 1; i < RANKS.length; i++) {
      expect(RANKS[i].threshold).toBeGreaterThan(RANKS[i - 1].threshold);
    }
  });

  it('first rank starts at threshold 0', () => {
    expect(RANKS[0].threshold).toBe(0);
  });

  it('every rank has all required visual properties', () => {
    for (const rank of RANKS) {
      expect(rank.id).toBeTruthy();
      expect(rank.name).toBeTruthy();
      expect(rank.description).toBeTruthy();
      expect(rank.color).toMatch(/^bg-/);
      expect(rank.textColor).toMatch(/^text-/);
      expect(rank.borderColor).toMatch(/^#/);
      expect(rank.glow).toMatch(/^rgba\(/);
      expect(rank.accentColor).toMatch(/^#/);
    }
  });
});

describe('determineRank', () => {
  // -----------------------------------------------------------------------
  // Exact threshold boundaries
  // -----------------------------------------------------------------------

  it('score 0 → Novice', () => {
    const result = determineRank(0);
    expect(result.current.id).toBe('novice');
    expect(result.previous).toBeNull();
    expect(result.next?.id).toBe('builder');
  });

  it('score 99 → still Novice (just below Builder)', () => {
    const result = determineRank(99);
    expect(result.current.id).toBe('novice');
    expect(result.next?.id).toBe('builder');
  });

  it('score 100 → Builder (exact boundary)', () => {
    const result = determineRank(100);
    expect(result.current.id).toBe('builder');
    expect(result.previous?.id).toBe('novice');
    expect(result.next?.id).toBe('craftsman');
  });

  it('score 250 → Craftsman', () => {
    const result = determineRank(250);
    expect(result.current.id).toBe('craftsman');
  });

  it('score 450 → Deep Worker', () => {
    const result = determineRank(450);
    expect(result.current.id).toBe('deep_worker');
  });

  it('score 700 → Master', () => {
    const result = determineRank(700);
    expect(result.current.id).toBe('master');
  });

  it('score 900 → Elite', () => {
    const result = determineRank(900);
    expect(result.current.id).toBe('elite');
    expect(result.next).toBeNull();
    expect(result.previous?.id).toBe('master');
  });

  it('score 999 → still Elite', () => {
    const result = determineRank(999);
    expect(result.current.id).toBe('elite');
  });

  // -----------------------------------------------------------------------
  // progressToNext
  // -----------------------------------------------------------------------

  it('progressToNext is 0 at exact rank threshold', () => {
    const result = determineRank(100); // Builder starts at 100
    expect(result.progressToNext).toBe(0);
  });

  it('progressToNext is ~0.5 at midpoint between ranks', () => {
    // Builder: 100, Craftsman: 250 → midpoint is 175
    const result = determineRank(175);
    expect(result.progressToNext).toBeCloseTo(0.5, 1);
  });

  it('progressToNext is 1 at Elite (no next rank)', () => {
    const result = determineRank(900);
    expect(result.progressToNext).toBe(1);
  });

  it('progressToNext is 1 at max score of 1000 (Elite)', () => {
    const result = determineRank(1000);
    expect(result.progressToNext).toBe(1);
  });

  it('progressToNext is clamped to [0, 1]', () => {
    // Test various scores to ensure clamping
    for (let score = 0; score <= 1000; score += 50) {
      const result = determineRank(score);
      expect(result.progressToNext).toBeGreaterThanOrEqual(0);
      expect(result.progressToNext).toBeLessThanOrEqual(1);
    }
  });
});

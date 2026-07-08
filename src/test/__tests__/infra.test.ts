import { describe, it, expect } from 'vitest';
import { createSession, createSessionsOverDays, resetFixtures } from '@/test/fixtures';

describe('Test Infrastructure Smoke Test', () => {
  beforeEach(() => {
    resetFixtures();
  });

  it('vitest runs and assertions work', () => {
    expect(1 + 1).toBe(2);
  });

  it('path aliases resolve correctly', () => {
    // If this test runs at all, the @/ alias is working
    const session = createSession();
    expect(session.type).toBe('focus_session');
    expect(session.durationMs).toBe(25 * 60 * 1000);
  });

  it('fixture factories produce valid data', () => {
    const sessions = createSessionsOverDays(3, 2);
    expect(sessions).toHaveLength(6);
    sessions.forEach((s) => {
      expect(s.id).toBeDefined();
      expect(s.startedAt).toBeLessThan(s.endedAt);
      expect(s.durationMs).toBeGreaterThan(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createSession, resetFixtures } from '@/test/fixtures';
import type { FocusSessionActivity, UserPreferences } from '@/types';

// ---------------------------------------------------------------------------
// Hoist mocks to avoid vi.mock hoisting issues
// ---------------------------------------------------------------------------

const {
  mockAuthValue,
  mockLoadActivities,
  mockLoadActiveTimer,
  mockLoadMusicSettings,
  mockLoadUploads,
  mockLoadUserPreferences,
  mockSaveUserPreferences,
} = vi.hoisted(() => {
  const _mockPrefs: UserPreferences = {
    dailyGoalMinutes: 240,
    sessionGoalMinutes: 25,
    showMilliseconds: false,
    timerDirection: 'up',
    joinedAt: Date.now() - 90 * 86400000,
    customCategories: [],
  };

  return {
    mockAuthValue: {
      user: null as any,
      isGuest: true,
      isLoading: false,
      profile: null,
      profileLoading: false,
      signUp: vi.fn(),
      signIn: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
      updateProfile: vi.fn(),
      setupProfile: vi.fn(),
      refreshProfile: vi.fn(),
    },
    mockLoadActivities: vi.fn().mockResolvedValue([]),
    mockLoadActiveTimer: vi.fn().mockResolvedValue(null),
    mockLoadMusicSettings: vi.fn().mockResolvedValue({ volume: 0.6, loop: true, lastTrackId: null }),
    mockLoadUploads: vi.fn().mockResolvedValue([]),
    mockLoadUserPreferences: vi.fn().mockResolvedValue(_mockPrefs),
    mockSaveUserPreferences: vi.fn(),
  };
});

vi.mock('@/context/auth-context', () => ({
  useAuth: () => mockAuthValue,
}));

vi.mock('@/lib/storage', () => ({
  loadActivities: mockLoadActivities,
  saveActivity: vi.fn(async (a: FocusSessionActivity) => [a]),
  updateActivity: vi.fn(async () => []),
  deleteActivity: vi.fn(async () => []),
  loadActiveTimer: mockLoadActiveTimer,
  saveActiveTimer: vi.fn(),
  loadMusicSettings: mockLoadMusicSettings,
  saveMusicSettings: vi.fn(),
  loadUserPreferences: mockLoadUserPreferences,
  saveUserPreferences: mockSaveUserPreferences,
  loadUploads: mockLoadUploads,
  saveUpload: vi.fn(),
  getUploadBlob: vi.fn().mockResolvedValue(null),
  deleteUpload: vi.fn(),
  renameUpload: vi.fn(),
  saveActivityToCloud: vi.fn(),
  deleteActivityFromCloud: vi.fn(),
  updateActivityInCloud: vi.fn(),
  loadCloudActivities: vi.fn().mockResolvedValue([]),
  syncLocalToCloud: vi.fn(),
  persistActivities: vi.fn(),
  clearUserData: vi.fn(),
}));

vi.mock('@/lib/audio', () => ({
  findTrack: vi.fn().mockReturnValue(null),
  mergeTracks: vi.fn().mockReturnValue([]),
  revokeObjectUrl: vi.fn(),
}));

// Import AFTER mocks
import { FocusProvider, useFocus } from '@/context/focus-app';

// ---------------------------------------------------------------------------
// Test helper
// ---------------------------------------------------------------------------

function FocusConsumer() {
  const focus = useFocus();
  return (
    <div>
      <span data-testid="load-state">{focus.loadState}</span>
      <span data-testid="is-running">{String(focus.isRunning)}</span>
      <span data-testid="is-paused">{String(focus.isPaused)}</span>
      <span data-testid="elapsed">{focus.elapsedMs}</span>
      <span data-testid="activity-count">{focus.activities.length}</span>
      <span data-testid="today-total">{focus.todayTotal}</span>
      <span data-testid="daily-goal">{focus.dailyGoalMinutes}</span>
      <span data-testid="show-ms">{String(focus.showMilliseconds)}</span>
      <span data-testid="direction">{focus.timerDirection}</span>
      <span data-testid="category">{focus.plannedCategory}</span>
    </div>
  );
}

function renderFocus() {
  return render(
    <FocusProvider>
      <FocusConsumer />
    </FocusProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FocusProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtures();
    // Reset auth mock to guest
    mockAuthValue.user = null;
    mockAuthValue.isGuest = true;
    mockAuthValue.isLoading = false;
    // Reset storage mocks
    mockLoadActivities.mockResolvedValue([]);
    mockLoadActiveTimer.mockResolvedValue(null);
  });

  it('boots and transitions to ready state', async () => {
    renderFocus();

    await waitFor(() => {
      expect(screen.getByTestId('load-state').textContent).toBe('ready');
    });
  });

  it('starts with timer not running', async () => {
    renderFocus();

    await waitFor(() => {
      expect(screen.getByTestId('load-state').textContent).toBe('ready');
    });

    expect(screen.getByTestId('is-running').textContent).toBe('false');
    expect(screen.getByTestId('is-paused').textContent).toBe('false');
    expect(screen.getByTestId('elapsed').textContent).toBe('0');
  });

  it('loads user preferences on boot', async () => {
    renderFocus();

    await waitFor(() => {
      expect(screen.getByTestId('load-state').textContent).toBe('ready');
    });

    expect(screen.getByTestId('daily-goal').textContent).toBe('240');
    expect(screen.getByTestId('show-ms').textContent).toBe('false');
    expect(screen.getByTestId('direction').textContent).toBe('up');
  });

  it('defaults planned category to studying', async () => {
    renderFocus();

    await waitFor(() => {
      expect(screen.getByTestId('load-state').textContent).toBe('ready');
    });

    expect(screen.getByTestId('category').textContent).toBe('studying');
  });

  it('loads activities from storage', async () => {
    const session = createSession();
    mockLoadActivities.mockResolvedValue([session]);

    renderFocus();

    await waitFor(() => {
      expect(screen.getByTestId('load-state').textContent).toBe('ready');
    });

    expect(screen.getByTestId('activity-count').textContent).toBe('1');
  });

  it('handles boot failure gracefully', async () => {
    mockLoadActivities.mockRejectedValueOnce(new Error('IDB failed'));

    renderFocus();

    await waitFor(() => {
      expect(screen.getByTestId('load-state').textContent).toBe('error');
    });
  });

  it('useFocus throws when used outside FocusProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<FocusConsumer />);
    }).toThrow('useFocus must be used within FocusProvider');

    consoleSpy.mockRestore();
  });
});

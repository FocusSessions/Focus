import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { Profile } from '@/types/supabase';
import {
  createMockUser,
  createMockProfile,
  createMockSession,
  createQueryBuilder,
  MOCK_USER_ID,
} from '@/test/mocks/supabase';

// ---------------------------------------------------------------------------
// Hoist mock variables so vi.mock factory can reference them
// ---------------------------------------------------------------------------

const { mockSupabase, mockProfile, mockUser, mockSession } = vi.hoisted(() => {
  const _mockProfile = {
    id: 'test-user-00000000-0000-0000-0000-000000000001',
    username: 'testuser',
    display_name: 'Test User',
    bio: null,
    avatar_url: null,
    is_public: true,
    privacy_level: 'public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const _mockUser = {
    id: 'test-user-00000000-0000-0000-0000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'test@example.com',
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: {
      username: 'testuser',
      display_name: 'Test User',
    },
    identities: [],
    factors: [],
  };

  const _mockSession = {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: _mockUser,
  };

  const _mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: _mockSession },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: _mockUser, session: _mockSession },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: _mockUser, session: _mockSession },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: 'https://example.com/oauth' },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: _mockUser },
        error: null,
      }),
      onAuthStateChange: vi.fn((callback: any) => {
        return {
          data: {
            subscription: { unsubscribe: vi.fn() },
          },
        };
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return createQueryBuilder<Profile>({
          data: _mockProfile,
          error: null,
        });
      }
      return createQueryBuilder({ data: null, error: null });
    }),
  };

  return {
    mockSupabase: _mockSupabase,
    mockProfile: _mockProfile,
    mockUser: _mockUser,
    mockSession: _mockSession,
  };
});

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}));

// ---------------------------------------------------------------------------
// Import AuthProvider AFTER mock is in place
// ---------------------------------------------------------------------------

import { AuthProvider, useAuth } from '@/context/auth-context';

// ---------------------------------------------------------------------------
// Test helper: consumer component that exposes auth state
// ---------------------------------------------------------------------------

function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="guest">{String(auth.isGuest)}</span>
      <span data-testid="user-id">{auth.user?.id ?? 'none'}</span>
      <span data-testid="username">{auth.profile?.username ?? 'none'}</span>
      <span data-testid="profile-loading">{String(auth.profileLoading)}</span>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default mock implementations
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return createQueryBuilder<Profile>({
          data: mockProfile,
          error: null,
        });
      }
      return createQueryBuilder({ data: null, error: null });
    });
  });

  it('shows loading state initially', () => {
    // Make getSession hang so we stay in loading
    mockSupabase.auth.getSession.mockReturnValue(new Promise(() => { }));

    renderAuth();
    expect(screen.getByTestId('loading').textContent).toBe('true');
  });

  it('transitions to authenticated state after session loads', async () => {
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('guest').textContent).toBe('false');
    expect(screen.getByTestId('user-id').textContent).toBe(MOCK_USER_ID);
  });

  it('loads profile after authentication', async () => {
    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('profile-loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('username').textContent).toBe('testuser');
  });

  it('enters guest mode when no session exists', async () => {
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    expect(screen.getByTestId('guest').textContent).toBe('true');
    expect(screen.getByTestId('user-id').textContent).toBe('none');
  });

  it('handles session initialization error gracefully', async () => {
    mockSupabase.auth.getSession.mockRejectedValue(new Error('Network error'));

    renderAuth();

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });

    // Should not crash — guest mode fallback
    expect(screen.getByTestId('guest').textContent).toBe('true');
  });

  it('useAuth throws when used outside AuthProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    expect(() => {
      render(<AuthConsumer />);
    }).toThrow('useAuth must be used within AuthProvider');

    consoleSpy.mockRestore();
  });
});

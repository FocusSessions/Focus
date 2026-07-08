/**
 * Supabase Mock Factory
 *
 * Provides a mock Supabase client that intercepts all calls at the module boundary.
 * Tests control what the "database" returns without any real network requests.
 */
import { vi } from 'vitest';
import type { Profile } from '@/types/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Default mock data
// ---------------------------------------------------------------------------

export const MOCK_USER_ID = 'test-user-00000000-0000-0000-0000-000000000001';

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: MOCK_USER_ID,
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
    ...overrides,
  } as User;
}

export function createMockProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: MOCK_USER_ID,
    username: 'testuser',
    display_name: 'Test User',
    bio: null,
    avatar_url: null,
    is_public: true,
    privacy_level: 'public',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockSession(user?: User): Session {
  const u = user ?? createMockUser();
  return {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: u,
  } as Session;
}

// ---------------------------------------------------------------------------
// Chainable query builder mock
// ---------------------------------------------------------------------------

export interface MockQueryResponse<T = unknown> {
  data: T | null;
  error: { message: string; code: string; details?: string } | null;
}

/**
 * Creates a chainable mock that simulates Supabase's PostgREST query builder.
 * Every method returns `this` (for chaining) until a terminal method resolves.
 */
export function createQueryBuilder<T = unknown>(
  response: MockQueryResponse<T> = { data: null, error: null }
) {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
    then: vi.fn((resolve: (val: MockQueryResponse<T>) => void) => resolve(response)),
  };

  // Make the builder itself thenable (for `await supabase.from(...).select(...)`)
  Object.defineProperty(builder, 'then', {
    value: (
      resolve: (val: MockQueryResponse<T>) => void,
      reject?: (err: unknown) => void
    ) => Promise.resolve(response).then(resolve, reject),
    writable: true,
    configurable: true,
  });

  return builder;
}

// ---------------------------------------------------------------------------
// Full Supabase client mock
// ---------------------------------------------------------------------------

type AuthStateCallback = (event: string, session: Session | null) => void;

export function createMockSupabaseClient(options?: {
  profile?: Profile | null;
  session?: Session | null;
  user?: User | null;
}) {
  const mockProfile = options?.profile ?? createMockProfile();
  const mockSession = options?.session ?? (options?.user !== null ? createMockSession() : null);
  const mockUser = options?.user ?? mockSession?.user ?? null;

  let authCallback: AuthStateCallback | null = null;

  const client = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({
        data: { url: 'https://example.com/oauth' },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
      onAuthStateChange: vi.fn((callback: AuthStateCallback) => {
        authCallback = callback;
        // Fire initial session event
        setTimeout(() => callback('INITIAL_SESSION', mockSession), 0);
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return createQueryBuilder<Profile>({
          data: mockProfile,
          error: null,
        });
      }
      return createQueryBuilder({ data: [], error: null });
    }),

    // Helper to simulate auth events in tests
    __simulateAuthEvent: (event: string, session: Session | null) => {
      authCallback?.(event, session);
    },
  };

  return client;
}

// ---------------------------------------------------------------------------
// vi.mock helper — call at the top of test files
// ---------------------------------------------------------------------------

/**
 * Usage in test files:
 *
 * ```ts
 * import { mockSupabaseModule } from '@/test/mocks/supabase';
 *
 * const { client } = mockSupabaseModule();
 *
 * // Now `import { supabase } from '@/lib/supabase'` will return `client`
 * ```
 */
export function mockSupabaseModule(options?: Parameters<typeof createMockSupabaseClient>[0]) {
  const client = createMockSupabaseClient(options);

  // vi.mock cannot be used here because Vitest hoists it aggressively, causing ReferenceError.
  // Test files should call vi.mock('@/lib/supabase', ...) directly with their own hoisted mock.

  return { client };
}

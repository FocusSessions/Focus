import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/__tests__/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov'],
      include: ['src/lib/**/*.ts'],
      exclude: [
        'src/lib/supabase.ts',       // Thin wrapper, tested via integration (Phase 3)
        'src/lib/achievements.ts',   // Complex module, needs mocks (Phase 3)
        'src/lib/storage.ts',        // Supabase storage calls (Phase 3)
        'src/lib/audio.ts',          // Browser Audio API (Phase 3)
        'src/lib/auth-errors.ts',    // Error mapping utility (Phase 3)
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});

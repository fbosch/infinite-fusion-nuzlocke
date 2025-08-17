/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'cobertura'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.next/**',
        '**/coverage/**',
        '**/*.config.*',
        '**/*.d.ts',
        'scripts/**',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/vitest.config.*',
        '**/coverage.config.*',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      all: true,
    },
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'browser',
          include: ['**/*.browser.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          browser: {
            enabled: true,
            provider: 'playwright',
            headless: true,
            instances: [
              {
                browser: 'chromium',
              },
            ],
          },
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'react-hooks',
          include: [
            '**/playthroughs.test.ts',
            '**/playthroughs/**/*.test.ts',
            '**/scrollToLocation.test.ts',
          ],
          environment: 'jsdom',
        },
      },
      {
        plugins: [tsconfigPaths()],
        test: {
          name: 'node',
          include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          exclude: [
            '**/*.browser.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            '**/playthroughs.test.ts',
            '**/playthroughs/**/*.test.ts',
            '**/scrollToLocation.test.ts',
            'node_modules',
            'dist',
            '.next',
          ],
          environment: 'node',
        },
      },
    ],
  },
});

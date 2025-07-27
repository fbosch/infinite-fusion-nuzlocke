/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  test: {
    globals: true,
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
          include: ['**/playthroughs.test.ts', '**/playthroughs/**/*.test.ts'],
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

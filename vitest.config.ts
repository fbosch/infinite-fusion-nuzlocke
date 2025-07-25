/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';


export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    projects: [
      {
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
        test: {
          name: 'node',
          include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
          exclude: ['**/*.browser.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'node_modules', 'dist', '.next'],
          environment: 'node',
        },
      },
    ],
  },
});

/// <reference types="vitest" />

import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const isBrowserTestsEnabled = process.env.VITEST_BROWSER === "true";
const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
  "@data": fileURLToPath(new URL("./data", import.meta.url)),
};

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov", "cobertura"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/.next/**",
        "**/coverage/**",
        "**/*.config.*",
        "**/*.d.ts",
        "scripts/**",
        "**/*.test.{js,ts,jsx,tsx}",
        "**/*.spec.{js,ts,jsx,tsx}",
        "**/vitest.config.*",
        "**/coverage.config.*",
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    projects: [
      ...(isBrowserTestsEnabled
        ? [
            {
              resolve: {
                alias,
              },
              plugins: react(),
              test: {
                name: "browser",
                include: [
                  "**/*.browser.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
                ],
                setupFiles: ["./tests/setup.browser.ts"],
                browser: {
                  enabled: true,
                  provider: "playwright" as never,
                  headless: true,
                  instances: [
                    {
                      browser: "chromium" as const,
                    },
                  ],
                },
              },
            },
          ]
        : []),
      {
        resolve: {
          alias,
        },
        test: {
          name: "react-hooks",
          include: ["**/playthroughs.test.ts", "**/playthroughs/**/*.test.ts"],
          setupFiles: ["./tests/setup.react-hooks.ts"],
          environment: "jsdom",
          pool: "threads",
        },
      },
      {
        resolve: {
          alias,
        },
        test: {
          name: "node",
          include: ["**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
          exclude: [
            "**/*.browser.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}",
            "**/playthroughs.test.ts",
            "**/playthroughs/**/*.test.ts",
            "**/scrollToLocation.test.ts",
            "node_modules",
            "dist",
            ".next",
          ],
          environment: "node",
        },
      },
    ],
  },
});

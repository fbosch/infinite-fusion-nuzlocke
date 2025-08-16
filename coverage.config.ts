export const coverageConfig = {
  provider: 'v8',
  reporter: [
    'text',
    'json',
    'html',
    'lcov',
    'cobertura'
  ],
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
  src: ['src/**/*.{js,ts,jsx,tsx}'],
  // GitHub integration
  reportsDirectory: './coverage',
  clean: true,
};

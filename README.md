# Infinite Fusion Nuzlocke Tracker

A Next.js application for tracking Nuzlocke runs in Pokémon Infinite Fusion, featuring fusion mechanics, encounter tracking, and comprehensive run management.

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Then run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Code Quality

This project uses Prettier and ESLint for code formatting and linting. To ensure code quality:

```bash
# Check formatting and linting
pnpm validate

# Fix formatting and auto-fix linting issues
pnpm validate:fix

# Individual commands
pnpm format:check  # Check Prettier formatting
pnpm format        # Format with Prettier
pnpm lint          # Run ESLint
pnpm lint:fix      # Run ESLint with auto-fix
```

## Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests with Vitest
- `pnpm test:ui` - Run tests with UI
- `pnpm test:run` - Run tests once
- `pnpm validate` - Check code formatting and linting
- `pnpm validate:fix` - Fix code formatting and auto-fix linting issues

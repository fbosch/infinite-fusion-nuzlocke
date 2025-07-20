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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Tooltips

This project includes a comprehensive tooltip system built with Floating UI that provides accessible, customizable tooltips throughout the application.

### Components

#### Basic Tooltip

```tsx
import { Tooltip } from '@/components';

<Tooltip content='This is a helpful tooltip'>
  <button>Hover me</button>
</Tooltip>;
```

#### Pokemon Tooltip

```tsx
import { PokemonTooltip } from '@/components';

const pokemon = {
  id: 25,
  name: 'Pikachu',
  nationalDexId: 25,
  nickname: 'Sparky',
  types: ['Electric'],
  stats: { hp: 35, attack: 55, defense: 40, speed: 90 },
  abilities: ['Static', 'Lightning Rod'],
};

<PokemonTooltip pokemon={pokemon}>
  <div>Pokemon Card</div>
</PokemonTooltip>;
```

#### Programmatic Tooltip Hook

```tsx
import { useTooltip } from '@/hooks';

function MyComponent() {
  const { refs, getReferenceProps, TooltipWrapper } = useTooltip({
    placement: 'bottom',
    delay: 300,
  });

  return (
    <>
      <button ref={refs.setReference} {...getReferenceProps()}>
        Advanced Button
      </button>
      <TooltipWrapper content='Custom tooltip content' />
    </>
  );
}
```

### Features

- **Accessibility**: Full keyboard navigation, screen reader support, ARIA attributes
- **Theme Support**: Works with light/dark themes
- **Smart Positioning**: Automatically flips and adjusts position to stay in viewport
- **Customizable**: Delay, placement, styling, and content options
- **Touch Friendly**: Works on mobile devices
- **Performance Optimized**: Uses Floating UI for efficient positioning

### Props

#### Tooltip Props

- `content`: React.ReactNode - The content to display
- `children`: React.ReactElement - The trigger element
- `placement`: 'top' | 'bottom' | 'left' | 'right' - Position relative to trigger
- `delay`: number - Delay before showing (default: 500ms)
- `disabled`: boolean - Whether tooltip is disabled
- `className`: string - Custom CSS classes
- `showArrow`: boolean - Whether to show arrow (default: true)
- `maxWidth`: string - Maximum width (default: '300px')

#### PokemonTooltip Props

All Tooltip props plus:

- `pokemon`: PokemonWithDetails - Pokemon data to display
- `showStats`: boolean - Whether to show base stats (default: true)
- `showSprite`: boolean - Whether to show Pokemon sprite (default: true)
- `spriteUrl`: string - Custom sprite URL override

### Usage Examples

You can import and use the tooltip components throughout your application:

```tsx
import { Tooltip, PokemonTooltip } from '@/components';
import { useTooltip } from '@/hooks';
```

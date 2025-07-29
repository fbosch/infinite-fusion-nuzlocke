// Tailwind CSS v4 default breakpoints
// These match the default Tailwind CSS breakpoints
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Get the current breakpoint based on window width
 * @param width - Window width in pixels
 * @returns Current breakpoint
 */
export function getBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints['2xl']) return '2xl';
  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'sm';
}

/**
 * Create a matchMedia query for a specific breakpoint
 * @param breakpoint - The breakpoint to create a query for
 * @returns Media query string
 */
export function createBreakpointQuery(breakpoint: Breakpoint): string {
  const width = breakpoints[breakpoint];
  return `(min-width: ${width}px)`;
}

/**
 * Create a matchMedia query for breakpoints smaller than the specified one
 * @param breakpoint - The breakpoint to create a query for
 * @returns Media query string
 */
export function createBreakpointSmallerThanQuery(
  breakpoint: Breakpoint
): string {
  const width = breakpoints[breakpoint];
  return `(max-width: ${width - 1}px)`;
}

/**
 * Create a matchMedia query for breakpoints between two values (inclusive)
 * @param min - Minimum breakpoint
 * @param max - Maximum breakpoint
 * @returns Media query string
 */
export function createBreakpointBetweenQuery(
  min: Breakpoint,
  max: Breakpoint
): string {
  const minWidth = breakpoints[min];
  const maxWidth = breakpoints[max];
  return `(min-width: ${minWidth}px) and (max-width: ${maxWidth}px)`;
}

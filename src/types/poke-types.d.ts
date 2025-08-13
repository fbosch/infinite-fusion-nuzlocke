declare module 'poke-types' {
  export function getTypeWeaknesses(
    type: string,
    secondType?: string
  ): Record<string, number>;
}

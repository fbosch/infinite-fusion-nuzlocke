'use client';

import type { PokemonOptionType } from '@/loaders/pokemon';

export type PCEntry = {
  locationId: string;
  locationName: string;
  head: PokemonOptionType | null;
  body: PokemonOptionType | null;
  position?: number;
  isFusion?: boolean;
};

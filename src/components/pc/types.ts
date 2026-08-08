"use client";

import type { PokemonOptionType } from "@/loaders/pokemon";

export interface PCEntry {
  body: PokemonOptionType | null;
  head: PokemonOptionType | null;
  isFusion?: boolean;
  locationId: string;
  locationName: string;
  position?: number;
}

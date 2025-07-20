import type { PokemonOption } from '@/loaders/pokemon';

/**
 * Type for encounter data with fusion status
 * Used to track Pokemon encounters and their fusion state
 */
export interface EncounterData {
  head: PokemonOption | null;
  body: PokemonOption | null;
  isFusion: boolean;
} 
import { v4 as uuidv4 } from "uuid";

export const PokemonStatus = {
  CAPTURED: "captured",
  DECEASED: "deceased",
  MISSED: "missed",
  RECEIVED: "received",
  STORED: "stored",
  TRADED: "traded",
} as const;

export type PokemonStatusType =
  (typeof PokemonStatus)[keyof typeof PokemonStatus];

export interface PokemonOptionType {
  id: number;
  name: string;
  nationalDexId: number;
  nickname?: string;
  originalLocation?: string;
  originalReceivalStatus?:
    | typeof PokemonStatus.CAPTURED
    | typeof PokemonStatus.RECEIVED
    | typeof PokemonStatus.TRADED;
  status?: PokemonStatusType;
  uid?: string;
}

export function generatePokemonUID(): string {
  return uuidv4();
}

export const isEggId = (id: number | undefined): boolean => id === -1;

export function isEgg(pokemon?: PokemonOptionType): boolean {
  return isEggId(pokemon?.id);
}

export function createEggEncounter(
  locationId?: string,
  nickname?: string,
): PokemonOptionType {
  return {
    id: -1,
    name: "Egg",
    nationalDexId: -1,
    nickname,
    originalLocation: locationId,
    uid: generatePokemonUID(),
  };
}

export function getEncounterDisplayName(encounter: PokemonOptionType): string {
  if (isEgg(encounter)) {
    return encounter.nickname || "Egg";
  }

  return encounter.nickname || encounter.name;
}

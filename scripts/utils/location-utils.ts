/**
 * Normalizes wiki-formatted location text to the names used in generated data.
 */
export function cleanLocationName(location: string): string {
  return location
    .replace(/\[\[([^\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/Pokémon/g, "Pokemon")
    .replace(/S\.S\.\s*Anne/g, "S.S. Anne")
    .trim();
}

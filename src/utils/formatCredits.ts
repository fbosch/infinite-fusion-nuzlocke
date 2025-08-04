/**
 * Format an array of artist credits into a human-readable string
 * Examples:
 * - [] → "Unknown artist"
 * - ["GameFreak"] → "GameFreak"
 * - ["GameFreak", "Artist"] → "GameFreak and Artist"
 * - ["GameFreak", "Artist1", "Artist2"] → "GameFreak, Artist1 and Artist2"
 * - ["GameFreak", "Artist1", "Artist2", "Artist3"] → "GameFreak, Artist1, Artist2 and Artist3"
 */
export function formatArtistCredits(artists?: string[] | null): string {
  // Handle empty or invalid input
  if (!artists || artists.length === 0) {
    return 'Unknown artist';
  }

  // Filter out empty strings and trim whitespace
  const cleanedArtists = artists
    .map(artist => artist.trim())
    .filter(artist => artist.length > 0);

  if (cleanedArtists.length === 0) {
    return 'Unknown artist';
  }

  // Single artist
  if (cleanedArtists.length === 1) {
    return cleanedArtists[0];
  }

  // Two artists
  if (cleanedArtists.length === 2) {
    return `${cleanedArtists[0]} and ${cleanedArtists[1]}`;
  }

  // Three or more artists
  const allButLast = cleanedArtists.slice(0, -1);
  const lastArtist = cleanedArtists[cleanedArtists.length - 1];

  return `${allButLast.join(', ')} and ${lastArtist}`;
}

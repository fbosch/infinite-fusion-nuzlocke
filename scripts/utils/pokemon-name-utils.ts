/**
 * Pokemon Name Utilities
 * 
 * Pure functions for Pokemon name resolution, normalization, and matching.
 * These utilities handle the complex logic of matching Pokemon names from various sources
 * (scraped data, API responses) to the canonical Infinite Fusion Pokemon database.
 */

export interface PokemonNameMap {
  nameToId: Map<string, number>;
  idToName: Map<number, string>;
}

/**
 * Creates variations of a Pokemon name for fuzzy matching
 */
export function createNameVariations(name: string): string[] {
  if (!name || typeof name !== 'string') {
    return [];
  }

  const variations = [
    name,                                     // Original: "Pidgey"
    name.toLowerCase(),                       // Lowercase: "pidgey"
    name.trim(),                             // Trimmed
    name.trim().toLowerCase(),               // Trimmed lowercase
    name.replace(/♀/g, 'F').replace(/♂/g, 'M'), // Gender symbols to letters
    name.replace(/♀/g, '').replace(/♂/g, ''), // Remove gender symbols
    name.replace(/\./g, ''),                 // Remove dots
    name.replace(/'/g, ''),                  // Remove apostrophes
    name.replace(/\s+/g, ''),                // Remove spaces
    name.replace(/\./g, '').replace(/\s+/g, '') // Remove dots and spaces
  ];

  // Add lowercase and clean versions of each variation
  const extendedVariations: string[] = [];
  for (const variation of variations) {
    extendedVariations.push(variation);
    extendedVariations.push(variation.toUpperCase());

    const lowerVariation = variation.toLowerCase();
    if (!extendedVariations.includes(lowerVariation)) {
      extendedVariations.push(lowerVariation);
    }

    const cleanVariation = lowerVariation.replace(/[^a-z]/g, '');
    if (!extendedVariations.includes(cleanVariation)) {
      extendedVariations.push(cleanVariation);
    }
  }

  // Remove duplicates and empty strings
  return [...new Set(extendedVariations)].filter(v => v.length > 0);
}

/**
 * Builds a comprehensive name-to-ID mapping from Pokemon data
 */
export function buildPokemonNameMap(pokemonData: Array<{ id: number; name: string }>): PokemonNameMap {
  const nameToId = new Map<string, number>();
  const idToName = new Map<number, string>();

  for (const pokemon of pokemonData) {
    if (!pokemon.name || !pokemon.id) {
      continue;
    }

    // Store original mapping
    idToName.set(pokemon.id, pokemon.name);

    // Create all variations and map them to the ID
    const variations = createNameVariations(pokemon.name);
    for (const variation of variations) {
      nameToId.set(variation, pokemon.id);
    }
  }

  return { nameToId, idToName };
}

/**
 * Finds a Pokemon ID by name using fuzzy matching
 */
export function findPokemonId(searchName: string, nameMap: PokemonNameMap): number | null {
  if (!searchName || typeof searchName !== 'string') {
    return null;
  }

  const variations = createNameVariations(searchName);

  for (const variation of variations) {
    if (nameMap.nameToId.has(variation)) {
      return nameMap.nameToId.get(variation)!;
    }
  }

  return null;
}

/**
 * Normalizes Pokemon names for PokeAPI compatibility
 */
export function normalizePokemonNameForAPI(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name.toLowerCase()
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .replace(/\./g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, '-')
    .replace(/é/g, 'e')
    // Handle specific Pokemon forms that need special API names
    .replace(/^aegislash.*$/i, 'aegislash-shield')
    .replace(/^oricorio.*$/i, 'oricorio-baile')
    .replace(/^deoxys.*$/i, 'deoxys-normal')
    .replace(/^gourgeist.*$/i, 'gourgeist-average')
    .replace(/^pumpkaboo.*$/i, 'pumpkaboo-average')
    .replace(/^castform.*$/i, 'castform')
    .replace(/^mimikyu.*$/i, 'mimikyu-disguised')
    .replace(/^giratina.*$/i, 'giratina-altered')
    .replace(/^minior.*$/i, 'minior-red-meteor')
    .replace(/^meloetta.*$/i, 'meloetta-aria')
    .replace(/^lycanroc.*$/i, 'lycanroc-midday')
    .replace(/^necrozma.*$/i, 'necrozma');
}

/**
 * Strips form suffixes from Pokemon names to get the base name
 * Useful for fallback when specific forms don't exist
 */
export function stripPokemonFormSuffix(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .replace(/\s+(baile|pom-pom|pau|sensu)\s+style$/i, '')
    .replace(/\s+(midday|midnight|dusk)\s+form$/i, '')
    .replace(/\s+(aria|pirouette)\s+form$/i, '')
    .replace(/\s+(meteor|core)\s+form$/i, '')
    .replace(/\s+(ordinary|resolute)\s+form$/i, '')
    .replace(/\s+(plant|sandy|trash)\s+cloak$/i, '')
    .replace(/\s+(heat|wash|frost|fan|mow)\s+rotom$/i, '')
    .replace(/\s+(land|sky)\s+forme$/i, '')
    .replace(/\s+(altered|origin)\s+forme$/i, '')
    .replace(/\s+(incarnate|therian)\s+forme$/i, '')
    .replace(/\s+(red|blue|yellow|green|orange|indigo|violet)\s+(meteor|core)$/i, '')
    .replace(/\s+style$/i, '')
    .replace(/\s+form$/i, '')
    .replace(/\s+forme$/i, '')
    .replace(/\s+cloak$/i, '')
    .replace(/\s+rotom$/i, '')
    .trim();
}

/**
 * Normalizes Pokemon names for PokéSprite repository URLs
 * PokéSprite uses lowercase names with hyphens for forms
 * Note: Some forms don't exist in PokeSprite, so we fall back to base forms
 */
export function normalizePokemonNameForSprite(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  // Convert to lowercase first
  const lowerName = name.toLowerCase();
  
  // Handle special form names and normalize to PokéSprite conventions
  return lowerName
    .replace(/♀/g, '-f')  // Female symbol -> -f
    .replace(/♂/g, '-m')  // Male symbol -> -m
    .replace(/\./g, '')    // Remove periods
    .replace(/'/g, '')     // Remove apostrophes
    .replace(/é/g, 'e')    // Remove accents
    
    // Handle specific form names for PokéSprite compatibility
    // Oricorio forms - only some forms exist in PokeSprite
    .replace(/\s+baile\s+style/g, '')  // Fall back to base oricorio
    .replace(/\s+pom-pom\s+style/g, '-pom-pom')
    .replace(/\s+pau\s+style/g, '-pau')
    .replace(/\s+sensu\s+style/g, '-sensu')
    
    // Lycanroc forms - only some forms exist in PokeSprite
    .replace(/\s+midday\s+form/g, '')  // Fall back to base lycanroc
    .replace(/\s+midnight\s+form/g, '-midnight')
    .replace(/\s+dusk\s+form/g, '-dusk')
    
    // Meloetta forms - only some forms exist in PokeSprite
    .replace(/\s+aria\s+form/g, '')  // Fall back to base meloetta
    .replace(/\s+pirouette\s+form/g, '-pirouette')
    
    // Minior forms - only base form exists in PokeSprite
    .replace(/\s+meteor\s+form/g, '')  // Fall back to base minior
    .replace(/\s+core\s+form/g, '')    // Fall back to base minior
    
    // Other forms
    .replace(/\s+ordinary\s+form/g, '')
    .replace(/\s+resolute\s+form/g, '-resolute')
    .replace(/\s+plant\s+cloak/g, '-plant')
    .replace(/\s+sandy\s+cloak/g, '-sandy')
    .replace(/\s+trash\s+cloak/g, '-trash')
    .replace(/\s+heat\s+rotom/g, '-heat')
    .replace(/\s+wash\s+rotom/g, '-wash')
    .replace(/\s+frost\s+rotom/g, '-frost')
    .replace(/\s+fan\s+rotom/g, '-fan')
    .replace(/\s+mow\s+rotom/g, '-mow')
    .replace(/\s+land\s+forme/g, '-land')
    .replace(/\s+sky\s+forme/g, '-sky')
    .replace(/\s+altered\s+forme/g, '-altered')
    .replace(/\s+origin\s+forme/g, '-origin')
    .replace(/\s+incarnate\s+forme/g, '-incarnate')
    .replace(/\s+therian\s+forme/g, '-therian')
    
    // General cleanup
    .replace(/[^a-z0-9-]/g, '-') // Replace other special chars with hyphens
    .replace(/-+/g, '-')         // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, '');      // Remove leading/trailing hyphens
}

/**
 * Validates if a text string looks like a Pokemon name (not metadata)
 */
export function isPotentialPokemonName(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const trimmed = text.trim();

  // Basic length check
  if (trimmed.length < 3 || trimmed.length > 20) {
    return false;
  }

  // Exclude common metadata patterns
  const excludePatterns = [
    /Level/i,
    /Rate/i,
    /%/,
    /Type/i,
    /Pokémon/i,
    /^\d+$/,           // Pure numbers (but not mixed alphanumeric)
    /^\d+-\d+$/,       // Number ranges
    /^\d+%$/           // Percentages
  ];

  return !excludePatterns.some(pattern => pattern.test(trimmed));
} 
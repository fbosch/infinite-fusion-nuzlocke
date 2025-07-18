#!/usr/bin/env node

import Pokedex from 'pokedex-promise-v2';
import fs from 'fs/promises';
import path from 'path';
import type { DexEntry } from './scrape-pokedex';

const P = new Pokedex(
);

interface PokemonType {
  name: string;
}

interface PokemonSpeciesData {
  is_legendary: boolean;
  is_mythical: boolean;
  generation: string | null;
}

interface ProcessedPokemonData {
  id: number;
  nationalDexId: number;
  name: string;
  types: PokemonType[];
}

async function fetchPokemonData(): Promise<ProcessedPokemonData[]> {

  try {
    console.log('Loading Pokemon entries...');

    // Read the pokemon entries with custom IDs and names
    const pokemonEntriesPath = path.join(process.cwd(), 'data/base-entries.json');
    const pokemonEntriesData = await fs.readFile(pokemonEntriesPath, 'utf8');
    const pokemonEntries: DexEntry[] = JSON.parse(pokemonEntriesData);

    console.log(`Found ${pokemonEntries.length} Pokemon entries to fetch data for.`);

    const pokemonData: ProcessedPokemonData[] = [];
    const batchSize = 20; // Keep reasonable batch size to avoid rate limiting

    for (let i = 0; i < pokemonEntries.length; i += batchSize) {
      const batch = pokemonEntries.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pokemonEntries.length / batchSize)} (${batch[0].name} - ${batch[batch.length - 1].name})`);

      const batchPromises = batch.map(async (entry: DexEntry): Promise<ProcessedPokemonData | null> => {
        const normalizedName = entry.name.toLowerCase()
          .replace(/♀/g, '-f')
          .replace(/♂/g, '-m')
          .replace(/\./g, '')
          .replace(/'/g, '')
          .replace(/\s+/g, '-')
          .replace(/é/g, 'e')

        const formHandledName = normalizedName
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

        try {
          console.log(`Fetching data for ${entry.name} (ID ${entry.id})`);

          const pokemon = await P.getPokemonByName(formHandledName);

          return {
            id: entry.id,
            nationalDexId: pokemon.id,
            name: entry.name, // Keep original name from Infinite Fusion
            types: pokemon.types.map((type: any) => ({
              name: type.type.name
            })),
          };
        } catch (error) {
          console.warn(`Failed to fetch data for "${entry.name}" (API name: ${normalizedName}) (ID ${entry.id}):`, error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      pokemonData.push(...batchResults.filter((result): result is ProcessedPokemonData => result !== null));

      // Small delay between batches to be respectful to the API
      if (i + batchSize < pokemonEntries.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`Successfully fetched data for ${pokemonData.length} Pokemon.`);

    // Sort by custom ID to maintain Infinite Fusion order
    pokemonData.sort((a, b) => a.id - b.id);

    // Write to JSON file
    const outputPath = path.join(process.cwd(), 'data/pokemon-data.json');
    await fs.writeFile(outputPath, JSON.stringify(pokemonData, null, 2));

    console.log(`✅ Successfully generated Pokemon data with names!`);
    console.log(`📁 Output saved to: ${outputPath}`);
    console.log(`📊 Total Pokemon: ${pokemonData.length}`);

    return pokemonData;

  } catch (error) {
    console.error('❌ Error fetching Pokemon data:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the fetcher
fetchPokemonData(); 
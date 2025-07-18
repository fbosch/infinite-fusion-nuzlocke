#!/usr/bin/env node

import Pokedex from 'pokedex-promise-v2';
import fs from 'fs/promises';
import path from 'path';

const P = new Pokedex();

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
  name: string;
  types: PokemonType[];
  species: PokemonSpeciesData;
}

async function fetchPokemonData(): Promise<ProcessedPokemonData[]> {
  try {
    console.log('Loading base Pokemon entries...');

    // Read the base entries
    const baseEntriesPath = path.join(process.cwd(), 'data/base-entries.json');
    const baseEntriesData = await fs.readFile(baseEntriesPath, 'utf8');
    const pokemonIds: number[] = JSON.parse(baseEntriesData);

    console.log(`Found ${pokemonIds.length} Pokemon entries to fetch data for.`);

    const pokemonData: ProcessedPokemonData[] = [];
    const batchSize = 20; // Increased batch size since we're fetching less data

    for (let i = 0; i < pokemonIds.length; i += batchSize) {
      const batch = pokemonIds.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(pokemonIds.length / batchSize)} (Pokemon ${batch[0]}-${batch[batch.length - 1]})`);

      const batchPromises = batch.map(async (id: number): Promise<ProcessedPokemonData | null> => {
        try {
          const [pokemon, species] = await Promise.all([
            P.getPokemonByName(id),
            P.getPokemonSpeciesByName(id)
          ]);

          return {
            id: pokemon.id,
            name: pokemon.name,
            types: pokemon.types.map(type => ({
              name: type.type.name
            })),
            species: {
              is_legendary: species.is_legendary,
              is_mythical: species.is_mythical,
              generation: species.generation?.name || null,
            }
          };
        } catch (error) {
          console.warn(`Failed to fetch data for Pokemon ID ${id}:`, error instanceof Error ? error.message : 'Unknown error');
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      pokemonData.push(...batchResults.filter((result): result is ProcessedPokemonData => result !== null));

      // Reduced delay since we're making fewer API calls per Pokemon
      if (i + batchSize < pokemonIds.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Successfully fetched data for ${pokemonData.length} Pokemon.`);

    // Sort by ID to maintain order
    pokemonData.sort((a, b) => a.id - b.id);

    // Write to JSON file
    const outputPath = path.join(process.cwd(), 'data/pokemon-data.json');
    await fs.writeFile(outputPath, JSON.stringify(pokemonData, null, 2));

    console.log(`✅ Successfully generated optimized Pokemon data!`);
    console.log(`📁 Output saved to: ${outputPath}`);
    console.log(`📊 Total Pokemon: ${pokemonData.length}`);
    console.log(`🚀 Data optimized for fast loading with minimal size`);

    return pokemonData;

  } catch (error) {
    console.error('❌ Error fetching Pokemon data:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the fetcher
fetchPokemonData(); 
import { NextRequest, NextResponse } from 'next/server';
import pokemonData from '@data/shared/pokemon-data.json';
import { PokemonSchema } from '@/loaders/pokemon';
import { z } from 'zod';

// Query parameter schema for filtering
const QuerySchema = z.object({
  ids: z.string().optional(), // Comma-separated list of Pokemon IDs
  search: z.string().optional(), // Search by name
  type: z.string().optional(), // Filter by type
  limit: z
    .string()
    .transform(val => parseInt(val, 10))
    .optional(), // Limit results
});

// Special Egg Pokemon entry
const EGG_POKEMON = {
  id: -1,
  nationalDexId: -1,
  name: 'Egg',
  types: [{ name: 'Normal' }],
  species: {
    is_legendary: false,
    is_mythical: false,
    generation: null,
    evolution_chain: null,
  },
  evolution: {
    evolves_to: [],
    evolves_from: undefined,
  },
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = Object.fromEntries(searchParams.entries());

    // Validate query parameters
    const validatedQuery = QuerySchema.safeParse(query);
    if (!validatedQuery.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validatedQuery.error.issues,
        },
        { status: 400 }
      );
    }

    const { ids, search, type, limit } = validatedQuery.data;

    // Start with regular Pokemon data and add the Egg
    let filteredData = [...pokemonData, EGG_POKEMON] as z.infer<
      typeof PokemonSchema
    >[];

    // Filter by IDs if provided
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id, 10));
      filteredData = filteredData.filter(pokemon =>
        idList.includes(pokemon.id)
      );
    }

    // Filter by search term if provided
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(pokemon =>
        pokemon.name.toLowerCase().includes(searchLower)
      );
    }

    // Filter by type if provided
    if (type) {
      filteredData = filteredData.filter(pokemon =>
        pokemon.types.some(t => t.name.toLowerCase() === type.toLowerCase())
      );
    }

    // Apply limit if provided
    if (limit && limit > 0) {
      filteredData = filteredData.slice(0, limit);
    }

    // Validate the filtered data
    const validatedData = z.array(PokemonSchema).safeParse(filteredData);
    if (!validatedData.success) {
      console.error('Data validation failed:', validatedData.error.issues);
      return NextResponse.json(
        { error: 'Data validation failed' },
        { status: 500 }
      );
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(
      {
        data: validatedData.data,
        count: validatedData.data.length,
        total: pokemonData.length + 1, // +1 for the Egg
      },
      {
        headers: {
          'Cache-Control': isDevelopment
            ? 'public, max-age=60' // 1 minute in dev
            : 'public, max-age=86400', // 24 hours in production
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'X-XSS-Protection': '1; mode=block',
        },
      }
    );
  } catch (error) {
    console.error('Error in Pokemon API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS - only allow same origin
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'same-origin',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

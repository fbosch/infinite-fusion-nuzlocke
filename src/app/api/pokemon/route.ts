import pokemonData from "@data/shared/pokemon-data.json";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PokemonSchema } from "@/validation/pokemon";

// Query parameter schema for filtering
const QuerySchema = z.object({
  ids: z.string().optional(), // Comma-separated list of Pokemon IDs
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform((val) => Number.parseInt(val, 10))
    .optional(), // Limit results
  search: z.string().optional(), // Search by name
  type: z.string().optional(), // Filter by type
  v: z.string().optional(), // Cache busting version (ignored)
});

// Special Egg Pokemon entry
const EGG_POKEMON = {
  evolution: {
    evolves_from: undefined,
    evolves_to: [],
  },
  id: -1,
  name: "Egg",
  nationalDexId: -1,
  species: {
    evolution_chain: null,
    generation: null,
    is_legendary: false,
    is_mythical: false,
  },
  types: [{ name: "Normal" }],
};

const getFilteredPokemon = ({
  ids,
  search,
  type,
  limit,
}: z.infer<typeof QuerySchema>) => {
  let filteredData = [...pokemonData, EGG_POKEMON] as z.infer<
    typeof PokemonSchema
  >[];

  if (ids) {
    const idSet = new Set(ids.split(",").map((id) => Number.parseInt(id, 10)));
    filteredData = filteredData.filter((pokemon) => idSet.has(pokemon.id));
  }

  if (search) {
    const searchLower = search.toLowerCase();
    filteredData = filteredData.filter((pokemon) =>
      pokemon.name.toLowerCase().includes(searchLower),
    );
  }

  if (type) {
    const typeLower = type.toLowerCase();
    filteredData = filteredData.filter((pokemon) =>
      pokemon.types.some(
        (pokemonType) => pokemonType.name.toLowerCase() === typeLower,
      ),
    );
  }

  if (limit && limit > 0) {
    filteredData = filteredData.slice(0, limit);
  }

  return filteredData;
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
          details: validatedQuery.error.issues,
          error: "Invalid query parameters",
        },
        { status: 400 },
      );
    }

    const filteredData = getFilteredPokemon(validatedQuery.data);

    // Validate the filtered data
    const validatedData = z.array(PokemonSchema).safeParse(filteredData);
    if (!validatedData.success) {
      console.error("Data validation failed:", validatedData.error.issues);
      return NextResponse.json(
        { error: "Data validation failed" },
        { status: 500 },
      );
    }

    const isDevelopment = process.env.NODE_ENV === "development";

    return NextResponse.json(
      {
        count: validatedData.data.length,
        data: validatedData.data,
        total: pokemonData.length + 1, // +1 for the Egg
      },
      {
        headers: {
          "Cache-Control": isDevelopment
            ? "public, max-age=60" // 1 minute in dev
            : "public, max-age=86400", // 24 hours in production
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "X-XSS-Protection": "1; mode=block",
        },
      },
    );
  } catch (error) {
    console.error("Error in Pokemon API route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Handle OPTIONS for CORS - only allow same origin
export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "same-origin",
    },
    status: 200,
  });
}

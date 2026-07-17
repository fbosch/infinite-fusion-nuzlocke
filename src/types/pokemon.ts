import { z } from "zod";

const PokemonTypeSchema = z.object({
  name: z.string().min(1, { error: "Type name is required" }),
});

const PokemonSpeciesSchema = z.object({
  is_legendary: z.boolean(),
  is_mythical: z.boolean(),
  generation: z.string().nullable(),
  evolution_chain: z
    .object({
      url: z.string().url({ error: "Invalid evolution chain URL" }),
    })
    .nullable(),
});

const EvolutionDetailSchema = z.object({
  id: z.number().int().positive({ error: "Evolution ID must be positive" }),
  name: z.string().min(1, { error: "Evolution name is required" }),
  min_level: z.number().int().positive().optional(),
  trigger: z.string().optional(),
  item: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
});

const EvolutionDataSchema = z.object({
  evolves_to: z.array(EvolutionDetailSchema),
  evolves_from: EvolutionDetailSchema.optional(),
});

export const PokemonSchema = z.object({
  id: z.number().int({ error: "Pokemon ID must be an integer" }),
  nationalDexId: z
    .number()
    .int({ error: "National Dex ID must be an integer" }),
  name: z.string().min(1, { error: "Pokemon name is required" }),
  types: z.array(PokemonTypeSchema),
  species: PokemonSpeciesSchema,
  evolution: EvolutionDataSchema.optional(),
});

export type Pokemon = z.infer<typeof PokemonSchema>;

export const PokemonArraySchema = z.array(PokemonSchema);

import { z } from "zod";
import type { Pokemon } from "@/types/pokemon";

const pokemonTypeSchema = z.object({ name: z.string().min(1) });
const evolutionDetailSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  min_level: z.number().int().positive().optional(),
  trigger: z.string().optional(),
  item: z.string().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
});

export const PokemonSchema = z.object({
  id: z.number().int(),
  nationalDexId: z.number().int(),
  name: z.string().min(1),
  types: z.array(pokemonTypeSchema),
  species: z.object({
    is_legendary: z.boolean(),
    is_mythical: z.boolean(),
    generation: z.string().nullable(),
    evolution_chain: z.object({ url: z.string().url() }).nullable(),
  }),
  evolution: z
    .object({
      evolves_to: z.array(evolutionDetailSchema),
      evolves_from: evolutionDetailSchema.optional(),
    })
    .optional(),
}) satisfies z.ZodType<Pokemon>;

export const PokemonApiResponseSchema = z.object({
  data: z.array(PokemonSchema),
  count: z.number(),
  total: z.number(),
});

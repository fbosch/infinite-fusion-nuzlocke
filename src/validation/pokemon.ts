import { z } from "zod";
import type { Pokemon } from "@/types/pokemon";

const pokemonTypeSchema = z.object({ name: z.string().min(1) });
const evolutionDetailSchema = z.object({
  condition: z.string().optional(),
  id: z.number().int().positive(),
  item: z.string().optional(),
  location: z.string().optional(),
  min_level: z.number().int().positive().optional(),
  name: z.string().min(1),
  trigger: z.string().optional(),
});

export const PokemonSchema = z.object({
  evolution: z
    .object({
      evolves_from: evolutionDetailSchema.optional(),
      evolves_to: z.array(evolutionDetailSchema),
    })
    .optional(),
  id: z.number().int(),
  name: z.string().min(1),
  nationalDexId: z.number().int(),
  species: z.object({
    evolution_chain: z.object({ url: z.string().url() }).nullable(),
    generation: z.string().nullable(),
    is_legendary: z.boolean(),
    is_mythical: z.boolean(),
  }),
  types: z.array(pokemonTypeSchema),
}) satisfies z.ZodType<Pokemon>;

export const PokemonApiResponseSchema = z.object({
  count: z.number(),
  data: z.array(PokemonSchema),
  total: z.number(),
});

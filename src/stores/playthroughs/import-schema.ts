import { z } from "zod";
import type { ImportedPlaythrough } from "./types";

const pokemonStatusSchema = z.enum([
  "captured",
  "received",
  "traded",
  "missed",
  "stored",
  "deceased",
]);

const pokemonOptionSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  nationalDexId: z.number().int(),
  nickname: z.string().optional(),
  originalLocation: z.string().optional(),
  originalReceivalStatus: z.enum(["captured", "received", "traded"]).optional(),
  status: pokemonStatusSchema.optional(),
  uid: z.string().optional(),
});

const customLocationSchema = z.object({
  id: z.string().min(1),
  insertAfterLocationId: z.string().min(1),
  name: z.string().min(1),
});

const playthroughSchema = z.object({
  createdAt: z.number(),
  customLocations: z.array(customLocationSchema).optional(),
  encounters: z
    .record(
      z.string(),
      z.object({
        body: pokemonOptionSchema.nullable(),
        head: pokemonOptionSchema.nullable(),
        isFusion: z.boolean(),
        updatedAt: z.number(),
      }),
    )
    .optional(),
  gameMode: z.enum(["classic", "remix", "randomized"]),
  id: z.string(),
  name: z.string(),
  team: z.object({
    members: z
      .array(
        z
          .object({ bodyPokemonUid: z.string(), headPokemonUid: z.string() })
          .nullable(),
      )
      .length(6),
  }),
  updatedAt: z.number(),
  version: z.string(),
});

export const ImportedPlaythroughSchema = z.object({
  exportedAt: z.string().optional(),
  playthrough: playthroughSchema,
  version: z.string().optional(),
}) satisfies z.ZodType<ImportedPlaythrough>;

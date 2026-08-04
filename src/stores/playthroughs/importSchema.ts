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
  status: pokemonStatusSchema.optional(),
  originalReceivalStatus: z.enum(["captured", "received", "traded"]).optional(),
  uid: z.string().optional(),
});

const customLocationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  insertAfterLocationId: z.string().min(1),
});

const playthroughSchema = z.object({
  id: z.string(),
  name: z.string(),
  customLocations: z.array(customLocationSchema).optional(),
  encounters: z
    .record(
      z.string(),
      z.object({
        head: pokemonOptionSchema.nullable(),
        body: pokemonOptionSchema.nullable(),
        isFusion: z.boolean(),
        updatedAt: z.number(),
      }),
    )
    .optional(),
  team: z.object({
    members: z
      .array(
        z
          .object({ headPokemonUid: z.string(), bodyPokemonUid: z.string() })
          .nullable(),
      )
      .length(6),
  }),
  gameMode: z.enum(["classic", "remix", "randomized"]),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.string(),
});

export const ImportedPlaythroughSchema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  playthrough: playthroughSchema,
}) satisfies z.ZodType<ImportedPlaythrough>;

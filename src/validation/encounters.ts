import { z } from "zod";
import {
  ENCOUNTER_TYPES,
  EncounterSource,
  type RouteEncounter,
} from "@/types/encounters";

export const EncounterTypeSchema = z.enum(ENCOUNTER_TYPES);

export const RouteEncountersArraySchema = z.array(
  z.object({
    pokemon: z.array(
      z.object({
        id: z
          .number()
          .int()
          .refine((id) => id > 0 || id === -1),
        source: z.enum(EncounterSource),
      }),
    ),
    routeName: z.string().min(1),
  }),
) satisfies z.ZodType<RouteEncounter[]>;

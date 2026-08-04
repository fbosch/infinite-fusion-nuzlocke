import { z } from "zod";
import {
  ENCOUNTER_TYPES,
  EncounterSource,
  type RouteEncounter,
} from "@/types/encounters";

export const EncounterTypeSchema = z.enum(ENCOUNTER_TYPES);

export const RouteEncountersArraySchema = z.array(
  z.object({
    routeName: z.string().min(1),
    pokemon: z.array(
      z.object({
        id: z
          .number()
          .int()
          .refine((id) => id > 0 || id === -1),
        source: z.enum(EncounterSource),
      }),
    ),
  }),
) satisfies z.ZodType<RouteEncounter[]>;

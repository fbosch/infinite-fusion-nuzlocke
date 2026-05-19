import { z } from "zod";
import { generatePrefixedId } from "@/utils/id";
import { migrateImportedPlaythroughData } from "./migrations";
import { ImportedPlaythroughSchema, type Playthrough } from "./types";

export const prepareImportedPlaythrough = (
  importData: unknown,
  existingIds: Iterable<string>,
): Playthrough => {
  try {
    const migratedImportData = migrateImportedPlaythroughData(importData);
    const validationResult =
      ImportedPlaythroughSchema.safeParse(migratedImportData);

    if (!validationResult.success) {
      throw validationResult.error;
    }

    const importedPlaythrough = validationResult.data.playthrough;
    const idSet = new Set(existingIds);
    const finalId = idSet.has(importedPlaythrough.id)
      ? generatePrefixedId("playthrough")
      : importedPlaythrough.id;

    return {
      id: finalId,
      name: importedPlaythrough.name,
      gameMode: importedPlaythrough.gameMode,
      version: importedPlaythrough.version || "1.0.0",
      createdAt: importedPlaythrough.createdAt,
      updatedAt: Date.now(),
      customLocations: importedPlaythrough.customLocations || [],
      encounters: importedPlaythrough.encounters || {},
      team: importedPlaythrough.team || {
        members: [null, null, null, null, null, null],
      },
    };
  } catch (error) {
    console.error("Failed to import playthrough:", error);

    if (error && typeof error === "object" && "issues" in error) {
      try {
        const prettyError = z.prettifyError(error as z.ZodError);
        throw new Error(`Validation failed:\n\n${prettyError}`);
      } catch {
        const zodError = error as z.ZodError;
        if (zodError.issues && zodError.issues.length > 0) {
          const errorDetails = zodError.issues
            .map((issue: z.ZodIssue) => {
              const path =
                issue.path.length > 0 ? ` at ${issue.path.join(".")}` : "";
              return `• ${issue.message}${path}`;
            })
            .join("\n");
          throw new Error(`Validation failed:\n\n${errorDetails}`);
        }
        throw new Error("Data validation failed");
      }
    }

    throw new Error("Invalid playthrough data format");
  }
};

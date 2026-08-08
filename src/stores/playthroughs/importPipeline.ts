import { generatePrefixedId } from "@/utils/id";
import { normalizeImportedPlaythrough } from "./migrations";
import type { Playthrough } from "./types";

export const prepareImportedPlaythrough = async (
  importData: unknown,
  existingIds: Iterable<string>,
): Promise<Playthrough> => {
  try {
    const migratedImportData = normalizeImportedPlaythrough(importData);
    const { ImportedPlaythroughSchema } = await import("./importSchema");
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
      createdAt: importedPlaythrough.createdAt,
      customLocations: importedPlaythrough.customLocations || [],
      encounters: importedPlaythrough.encounters || {},
      gameMode: importedPlaythrough.gameMode,
      id: finalId,
      name: importedPlaythrough.name,
      team: importedPlaythrough.team || {
        members: [null, null, null, null, null, null],
      },
      updatedAt: Date.now(),
      version: importedPlaythrough.version || "1.0.0",
    };
  } catch (error) {
    console.error("Failed to import playthrough:", error);

    if (error && typeof error === "object" && "issues" in error) {
      const zodError = error as {
        issues: Array<{ path: PropertyKey[]; message: string }>;
      };
      let prettyError: string | null = null;

      try {
        const { z } = await import("zod");
        prettyError = z.prettifyError(zodError as never);
      } catch {
        // Fall back to manual issue formatting.
      }

      if (prettyError) {
        throw new Error(`Validation failed:\n\n${prettyError}`);
      }

      if (zodError.issues.length > 0) {
        const errorDetails = zodError.issues
          .map((issue) => {
            const path =
              issue.path.length > 0 ? ` at ${issue.path.join(".")}` : "";
            return `• ${issue.message}${path}`;
          })
          .join("\n");
        throw new Error(`Validation failed:\n\n${errorDetails}`);
      }

      throw new Error("Data validation failed");
    }

    throw new Error("Invalid playthrough data format");
  }
};

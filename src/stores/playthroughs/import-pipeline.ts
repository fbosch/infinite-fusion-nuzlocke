import { generatePrefixedId } from "@/utils/id";
import { normalizeImportedPlaythrough } from "./migrations";
import type { Playthrough } from "./types";

interface ValidationError {
  issues: Array<{ path: PropertyKey[]; message: string }>;
}

const isValidationError = (error: unknown): error is ValidationError =>
  error !== null && typeof error === "object" && "issues" in error;

const createImportError = async (error: unknown): Promise<Error> => {
  if (isValidationError(error) === false) {
    return new Error("Invalid playthrough data format", { cause: error });
  }

  try {
    const { z } = await import("zod");
    const prettyError = z.prettifyError(error as never);
    if (prettyError) {
      return new Error(`Validation failed:\n\n${prettyError}`, {
        cause: error,
      });
    }
  } catch {
    // Fall back to manual issue formatting.
  }

  const errorDetails = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? ` at ${issue.path.join(".")}` : "";
      return `• ${issue.message}${path}`;
    })
    .join("\n");

  return errorDetails
    ? new Error(`Validation failed:\n\n${errorDetails}`, { cause: error })
    : new Error("Data validation failed", { cause: error });
};

export const prepareImportedPlaythrough = async (
  importData: unknown,
  existingIds: Iterable<string>,
): Promise<Playthrough> => {
  try {
    const migratedImportData = normalizeImportedPlaythrough(importData);
    const { ImportedPlaythroughSchema } = await import("./import-schema");
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
    throw await createImportError(error);
  }
};

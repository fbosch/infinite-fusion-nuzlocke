import { getSharedEventProperties } from "@/lib/analytics/selectors";
import {
  type FileExtensionGroup,
  type ImportErrorCategory,
  type ImportFailureStage,
  type MimeGroup,
  trackEvent,
} from "@/lib/analytics/trackEvent";
import { playthroughActions } from "@/stores/playthroughs/index";
import type {
  ExportedPlaythrough,
  GameMode,
  Playthrough,
} from "@/stores/playthroughs/types";

const IMPORT_SOURCE = "file_picker" as const;

type ImportFileContext = {
  hasFile: boolean;
  fileExtensionGroup: FileExtensionGroup;
  mimeGroup: MimeGroup;
};

type ImportPlaythroughFileResult =
  | { ok: true }
  | { ok: false; errorMessage: string };

const getFileExtensionGroup = (fileName?: string): FileExtensionGroup => {
  if (!fileName) {
    return "other";
  }

  return fileName.toLowerCase().endsWith(".json") ? "json" : "other";
};

const getMimeGroup = (mimeType?: string): MimeGroup => {
  if (!mimeType) {
    return "empty";
  }

  if (mimeType === "application/json") {
    return "application_json";
  }

  if (mimeType === "text/plain") {
    return "text_plain";
  }

  return "other";
};

const createFileContext = (file?: File): ImportFileContext => {
  if (!file) {
    return {
      fileExtensionGroup: "other",
      hasFile: false,
      mimeGroup: "empty",
    };
  }

  return {
    fileExtensionGroup: getFileExtensionGroup(file.name),
    hasFile: true,
    mimeGroup: getMimeGroup(file.type),
  };
};

const isStorageFailureMessage = (message: string) => {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("storage") ||
    normalizedMessage.includes("indexeddb")
  );
};

export const getImportErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return fallback;
};

const resolvePlaythroughForImportAnalytics = async (playthroughId?: string) => {
  if (typeof playthroughActions.getActivePlaythrough === "function") {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!playthroughId || activePlaythrough?.id === playthroughId) {
      return activePlaythrough;
    }
  }

  return null;
};

const trackImportFailure = async ({
  failureStage,
  errorCategory,
  fileContext,
  playthroughId,
}: {
  failureStage: ImportFailureStage;
  errorCategory: ImportErrorCategory;
  fileContext: ImportFileContext;
  playthroughId?: string;
}) => {
  const analyticsPlaythrough =
    await resolvePlaythroughForImportAnalytics(playthroughId);
  if (!analyticsPlaythrough) {
    return;
  }

  trackEvent("playthrough_import_failed", {
    ...getSharedEventProperties(analyticsPlaythrough),
    error_category: errorCategory,
    failure_stage: failureStage,
    file_extension_group: fileContext.fileExtensionGroup,
    has_file: fileContext.hasFile,
    import_source: IMPORT_SOURCE,
    mime_group: fileContext.mimeGroup,
  });
};

const trackImportSuccess = async ({
  playthroughId,
  fileContext,
}: {
  playthroughId: string;
  fileContext: ImportFileContext;
}) => {
  const analyticsPlaythrough =
    await resolvePlaythroughForImportAnalytics(playthroughId);
  if (!analyticsPlaythrough) {
    return;
  }

  trackEvent("playthrough_imported", {
    ...getSharedEventProperties(analyticsPlaythrough),
    file_extension_group: fileContext.fileExtensionGroup,
    import_source: IMPORT_SOURCE,
    mime_group: fileContext.mimeGroup,
  });
};

export const exportPlaythrough = (playthrough: Playthrough) => {
  try {
    const exportData: ExportedPlaythrough = {
      exportedAt: new Date().toISOString(),
      playthrough: {
        createdAt: playthrough.createdAt,
        customLocations: playthrough.customLocations,
        encounters: playthrough.encounters,
        gameMode: playthrough.gameMode as GameMode,
        id: playthrough.id,
        name: playthrough.name,
        team: playthrough.team,
        updatedAt: playthrough.updatedAt,
        version: playthrough.version || "1.0.0",
      },
      version: "1.0.0",
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${playthrough.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_playthrough.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    trackEvent("playthrough_exported", getSharedEventProperties(playthrough));
  } catch (error) {
    console.error("Failed to export playthrough:", error);
  }
};

export const importPlaythroughFile = async (
  file: File,
): Promise<ImportPlaythroughFileResult> => {
  const fileContext = createFileContext(file);
  let importFailureStage: ImportFailureStage = "unknown";
  let importErrorCategory: ImportErrorCategory = "unexpected";

  try {
    if (!file.name.toLowerCase().endsWith(".json")) {
      await trackImportFailure({
        errorCategory: "unsupported_file_type",
        failureStage: "file_selection",
        fileContext,
      });
      return { errorMessage: "File must have a .json extension", ok: false };
    }

    if (
      file.type &&
      file.type !== "application/json" &&
      file.type !== "text/plain"
    ) {
      await trackImportFailure({
        errorCategory: "unsupported_file_type",
        failureStage: "file_selection",
        fileContext,
      });
      return { errorMessage: "File is not a valid JSON file", ok: false };
    }

    importFailureStage = "file_read";
    const text = await file.text();

    importFailureStage = "json_parse";
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      await trackImportFailure({
        errorCategory: "invalid_json",
        failureStage: importFailureStage,
        fileContext,
      });
      return { errorMessage: "Invalid JSON syntax", ok: false };
    }

    importFailureStage = "store_import";
    const newId = await playthroughActions.importPlaythrough(data);
    await trackImportSuccess({
      fileContext,
      playthroughId: newId,
    });

    return { ok: true };
  } catch (error) {
    console.error("Failed to import playthrough:", error);

    let errorMessage = "Import failed";

    if (error instanceof Error) {
      errorMessage = error.message;

      if (importFailureStage === "store_import") {
        if (error.message.startsWith("Validation failed:")) {
          importFailureStage = "schema_validation";
          importErrorCategory = "invalid_schema";
        } else if (isStorageFailureMessage(error.message)) {
          importErrorCategory = "storage_failure";
        }
      } else if (
        importFailureStage === "file_read" &&
        isStorageFailureMessage(error.message)
      ) {
        importErrorCategory = "storage_failure";
      }
    }

    await trackImportFailure({
      errorCategory: importErrorCategory,
      failureStage: importFailureStage,
      fileContext,
    });

    return { errorMessage, ok: false };
  }
};

export const trackImportPickerFailure = async () => {
  await trackImportFailure({
    errorCategory: "unexpected",
    failureStage: "unknown",
    fileContext: createFileContext(),
  });
};

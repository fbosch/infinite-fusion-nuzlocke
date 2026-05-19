import { getSharedEventProperties } from "@/lib/analytics/selectors";
import {
  type FileExtensionGroup,
  type ImportErrorCategory,
  type ImportFailureStage,
  type MimeGroup,
  trackEvent,
} from "@/lib/analytics/trackEvent";
import {
  type ExportedPlaythrough,
  type GameMode,
  type Playthrough,
  playthroughActions,
} from "@/stores/playthroughs";

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
      hasFile: false,
      fileExtensionGroup: "other",
      mimeGroup: "empty",
    };
  }

  return {
    hasFile: true,
    fileExtensionGroup: getFileExtensionGroup(file.name),
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
  if (
    playthroughId &&
    typeof playthroughActions.getAllPlaythroughs === "function"
  ) {
    const importedPlaythroughs = await playthroughActions.getAllPlaythroughs();
    const importedPlaythrough = importedPlaythroughs.find(
      (playthrough) => playthrough.id === playthroughId,
    );

    if (importedPlaythrough) {
      return importedPlaythrough;
    }
  }

  if (typeof playthroughActions.getActivePlaythrough === "function") {
    return playthroughActions.getActivePlaythrough();
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
    import_source: IMPORT_SOURCE,
    failure_stage: failureStage,
    error_category: errorCategory,
    has_file: fileContext.hasFile,
    file_extension_group: fileContext.fileExtensionGroup,
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
    import_source: IMPORT_SOURCE,
    file_extension_group: fileContext.fileExtensionGroup,
    mime_group: fileContext.mimeGroup,
  });
};

export const exportPlaythrough = (playthrough: Playthrough) => {
  try {
    const exportData: ExportedPlaythrough = {
      version: "1.0.0",
      exportedAt: new Date().toISOString(),
      playthrough: {
        id: playthrough.id,
        name: playthrough.name,
        gameMode: playthrough.gameMode as GameMode,
        createdAt: playthrough.createdAt,
        updatedAt: playthrough.updatedAt,
        version: playthrough.version || "1.0.0",
        customLocations: playthrough.customLocations,
        encounters: playthrough.encounters,
        team: playthrough.team,
      },
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
        failureStage: "file_selection",
        errorCategory: "unsupported_file_type",
        fileContext,
      });
      return { ok: false, errorMessage: "File must have a .json extension" };
    }

    if (
      file.type &&
      file.type !== "application/json" &&
      file.type !== "text/plain"
    ) {
      await trackImportFailure({
        failureStage: "file_selection",
        errorCategory: "unsupported_file_type",
        fileContext,
      });
      return { ok: false, errorMessage: "File is not a valid JSON file" };
    }

    importFailureStage = "file_read";
    const text = await file.text();

    importFailureStage = "json_parse";
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      await trackImportFailure({
        failureStage: importFailureStage,
        errorCategory: "invalid_json",
        fileContext,
      });
      return { ok: false, errorMessage: "Invalid JSON syntax" };
    }

    importFailureStage = "store_import";
    const newId = await playthroughActions.importPlaythrough(data);
    await trackImportSuccess({
      playthroughId: newId,
      fileContext,
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
      failureStage: importFailureStage,
      errorCategory: importErrorCategory,
      fileContext,
    });

    return { ok: false, errorMessage };
  }
};

export const trackImportPickerFailure = async () => {
  await trackImportFailure({
    failureStage: "unknown",
    errorCategory: "unexpected",
    fileContext: createFileContext(),
  });
};

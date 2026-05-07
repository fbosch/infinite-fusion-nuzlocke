import { useCallback, useState } from "react";
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

const getErrorMessage = (error: unknown, fallback: string) => {
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

// Helper function to export playthrough data as JSON
const exportPlaythrough = (playthrough: Playthrough) => {
  try {
    // Create a clean export object with only the necessary data
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

    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement("a");
    link.href = url;
    link.download = `${playthrough.name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_playthrough.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL
    URL.revokeObjectURL(url);

    trackEvent("playthrough_exported", getSharedEventProperties(playthrough));
  } catch (error) {
    console.error("Failed to export playthrough:", error);
  }
};

export function usePlaythroughImportExport() {
  const [showImportError, setShowImportError] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState("");

  const handleExportClick = useCallback(
    (playthrough: Playthrough, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      exportPlaythrough(playthrough);
    },
    [],
  );

  const handleExportKeyDown = useCallback(
    (playthrough: Playthrough, e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        e.stopPropagation();
        exportPlaythrough(playthrough);
      }
    },
    [],
  );

  const handleImportClick = useCallback(async () => {
    try {
      // Create file input element
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json,application/json,text/plain";

      input.onchange = async (e) => {
        let importFailureStage: ImportFailureStage = "unknown";
        let importErrorCategory: ImportErrorCategory = "unexpected";

        try {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          const fileContext = createFileContext(file);

          if (!file) {
            input.remove();
            return;
          }

          // Check file extension
          if (!file.name.toLowerCase().endsWith(".json")) {
            importFailureStage = "file_selection";
            importErrorCategory = "unsupported_file_type";
            await trackImportFailure({
              failureStage: importFailureStage,
              errorCategory: importErrorCategory,
              fileContext,
            });

            setImportErrorMessage("File must have a .json extension");
            setShowImportError(true);
            input.remove();
            return;
          }

          // Check MIME type if available
          if (
            file.type &&
            file.type !== "application/json" &&
            file.type !== "text/plain"
          ) {
            importFailureStage = "file_selection";
            importErrorCategory = "unsupported_file_type";
            await trackImportFailure({
              failureStage: importFailureStage,
              errorCategory: importErrorCategory,
              fileContext,
            });

            setImportErrorMessage("File is not a valid JSON file");
            setShowImportError(true);
            input.remove();
            return;
          }

          importFailureStage = "file_read";
          const text = await file.text();

          // Try to parse as JSON first to catch JSON syntax errors
          importFailureStage = "json_parse";
          let data: unknown;
          try {
            data = JSON.parse(text);
          } catch {
            importErrorCategory = "invalid_json";
            await trackImportFailure({
              failureStage: importFailureStage,
              errorCategory: importErrorCategory,
              fileContext,
            });

            setImportErrorMessage("Invalid JSON syntax");
            setShowImportError(true);
            input.remove();
            return;
          }

          // Import the playthrough
          importFailureStage = "store_import";
          const newId = await playthroughActions.importPlaythrough(data);
          await trackImportSuccess({
            playthroughId: newId,
            fileContext,
          });

          // Clean up
          input.remove();
        } catch (error) {
          console.error("Failed to import playthrough:", error);

          const file = (e.target as HTMLInputElement).files?.[0];
          const fileContext = createFileContext(file);

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

          setImportErrorMessage(errorMessage);
          setShowImportError(true);
          input.remove();
        }
      };

      input.click();
    } catch (error) {
      console.error("Import failed:", error);
      await trackImportFailure({
        failureStage: "unknown",
        errorCategory: "unexpected",
        fileContext: createFileContext(),
      });

      setImportErrorMessage(
        getErrorMessage(error, "Import failed. Please try again."),
      );
      setShowImportError(true);
    }
  }, []);

  return {
    showImportError,
    setShowImportError,
    importErrorMessage,
    handleExportClick,
    handleExportKeyDown,
    handleImportClick,
  };
}

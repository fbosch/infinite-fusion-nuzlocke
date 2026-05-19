import { useCallback, useState } from "react";
import type { Playthrough } from "@/stores/playthroughs";
import {
  exportPlaythrough,
  getImportErrorMessage,
  importPlaythroughFile,
  trackImportPickerFailure,
} from "./playthroughImportExportWorkflow";

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
        try {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];

          if (!file) {
            return;
          }

          const result = await importPlaythroughFile(file);
          if (!result.ok) {
            setImportErrorMessage(result.errorMessage);
            setShowImportError(true);
          }
        } catch (error) {
          console.error("Failed to import playthrough:", error);
          setImportErrorMessage(getImportErrorMessage(error, "Import failed"));
          setShowImportError(true);
        } finally {
          input.remove();
        }
      };

      input.click();
    } catch (error) {
      console.error("Import failed:", error);
      await trackImportPickerFailure();

      setImportErrorMessage(
        getImportErrorMessage(error, "Import failed. Please try again."),
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

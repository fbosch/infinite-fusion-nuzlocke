import { useCallback, useState } from 'react';
import {
  playthroughActions,
  type Playthrough,
  type ExportedPlaythrough,
} from '@/stores/playthroughs';
import { GameMode } from '@/types';

// Helper function to export playthrough data as JSON
const exportPlaythrough = (playthrough: Playthrough) => {
  try {
    // Create a clean export object with only the necessary data
    const exportData: ExportedPlaythrough = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      playthrough: {
        id: playthrough.id,
        name: playthrough.name,
        gameMode: playthrough.gameMode as GameMode,
        createdAt: playthrough.createdAt,
        updatedAt: playthrough.updatedAt,
        customLocations: playthrough.customLocations,
        encounters: playthrough.encounters,
      },
    };

    // Convert to JSON string with pretty formatting
    const jsonString = JSON.stringify(exportData, null, 2);

    // Create blob and download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = `${playthrough.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_playthrough.json`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export playthrough:', error);
  }
};

export function usePlaythroughImportExport() {
  const [showImportError, setShowImportError] = useState(false);
  const [importErrorMessage, setImportErrorMessage] = useState('');

  const handleExportClick = useCallback(
    (playthrough: Playthrough, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      exportPlaythrough(playthrough);
    },
    []
  );

  const handleExportKeyDown = useCallback(
    (playthrough: Playthrough, e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        exportPlaythrough(playthrough);
      }
    },
    []
  );

  const handleImportClick = useCallback(async () => {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json,text/plain';

      input.onchange = async e => {
        try {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];

          if (!file) {
            input.remove();
            return;
          }

          // Check file extension
          if (!file.name.toLowerCase().endsWith('.json')) {
            setImportErrorMessage('File must have a .json extension');
            setShowImportError(true);
            input.remove();
            return;
          }

          // Check MIME type if available
          if (
            file.type &&
            file.type !== 'application/json' &&
            file.type !== 'text/plain'
          ) {
            setImportErrorMessage('File is not a valid JSON file');
            setShowImportError(true);
            input.remove();
            return;
          }

          const text = await file.text();

          // Try to parse as JSON first to catch JSON syntax errors
          let data;
          try {
            data = JSON.parse(text);
          } catch (_jsonError) {
            setImportErrorMessage('Invalid JSON syntax');
            setShowImportError(true);
            input.remove();
            return;
          }

          // Import the playthrough
          const newId = await playthroughActions.importPlaythrough(data);
          console.log('Successfully imported playthrough:', newId);

          // Clean up
          input.remove();
        } catch (error) {
          console.error('Failed to import playthrough:', error);

          let errorMessage = 'Import failed';

          if (error instanceof Error) {
            errorMessage = error.message;
          }

          setImportErrorMessage(errorMessage);
          setShowImportError(true);
          input.remove();
        }
      };

      input.click();
    } catch (error) {
      console.error('Import failed:', error);
      setImportErrorMessage('Import failed. Please try again.');
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

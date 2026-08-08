import clsx from "clsx";
import { Eraser } from "lucide-react";
import { useState } from "react";
import { playthroughActions } from "@/stores/playthroughs";
import ConfirmationDialog from "../ConfirmationDialog";
import { CursorTooltip } from "../CursorTooltip";

interface ResetEncounterButtonProps {
  hasEncounter: boolean;
  locationId: string;
  locationName: string;
}

export default function ResetEncounterButton({
  locationId,
  locationName,
  hasEncounter,
}: ResetEncounterButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleButtonClick = () => {
    setIsDialogOpen(true);
  };

  const handleConfirm = () => {
    playthroughActions.resetEncounter(locationId);
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <CursorTooltip
        className="origin-top-right"
        content={"Reset the encounter for this location"}
        delay={300}
        placement={"bottom-end"}
      >
        <button
          aria-label={`Reset encounter for ${locationName}`}
          className={clsx(
            "flex size-8 cursor-pointer items-center justify-center rounded-md transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-30",
            "text-gray-400 enabled:hover:bg-orange-50 enabled:hover:text-orange-600",
            "dark:text-gray-500 dark:enabled:hover:bg-orange-900/20 dark:enabled:hover:text-orange-400",
          )}
          disabled={!hasEncounter}
          onClick={handleButtonClick}
          type="button"
        >
          <Eraser className="size-4" />
        </button>
      </CursorTooltip>

      <ConfirmationDialog
        cancelText="Cancel"
        confirmText="Reset"
        isOpen={isDialogOpen}
        message={`Are you sure you want to reset the encounter for ${locationName}?`}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Reset Encounter"
        variant="warning"
      />
    </>
  );
}

import clsx from "clsx";
import { TrashIcon } from "lucide-react";
import { useState } from "react";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { playthroughActions } from "@/stores/playthroughs";
import { CursorTooltip } from "../../CursorTooltip";

interface RemoveLocationButtonProps {
  locationId: string;
  locationName: string;
}

export default function RemoveLocationButton({
  locationId,
  locationName,
}: RemoveLocationButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleButtonClick = () => {
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    await playthroughActions.removeCustomLocation(locationId);
    setIsDialogOpen(false);
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      <CursorTooltip
        className="origin-top-right"
        content={"Remove the custom location"}
        placement={"bottom-end"}
      >
        <button
          aria-label={`Remove custom location ${locationName}`}
          className={clsx(
            "flex size-8 items-center justify-center rounded-md transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2",
            "text-gray-400 hover:bg-red-50 hover:text-red-600",
            "dark:text-gray-500 dark:hover:bg-red-900/20 dark:hover:text-red-400",
          )}
          onClick={handleButtonClick}
          type="button"
        >
          <TrashIcon className="size-4" />
        </button>
      </CursorTooltip>

      <ConfirmationDialog
        cancelText="Cancel"
        confirmText="Remove"
        isOpen={isDialogOpen}
        message={`Are you sure you want to remove the custom location "${locationName}"? This action cannot be undone.`}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title="Remove Custom Location"
        variant="danger"
      />
    </>
  );
}

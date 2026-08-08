"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { Loader2, Plus, X } from "lucide-react";
import { useState } from "react";
import { getLocationsSortedWithCustom } from "@/loaders";
import { useCustomLocations } from "@/stores/playthroughs/hooks";
import { playthroughActions } from "@/stores/playthroughs/index";

interface AddCustomLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddCustomLocationModal({
  isOpen,
  onClose,
}: AddCustomLocationModalProps) {
  const [locationName, setLocationName] = useState("");
  const [selectedAfterLocationId, setSelectedAfterLocationId] = useState("");
  const customLocations = useCustomLocations();

  const handleClose = () => {
    setLocationName("");
    setSelectedAfterLocationId("");
    onClose();
  };

  // Only process locations when modal is open to improve performance
  const allLocations = (() => {
    if (!isOpen) {
      return [];
    }
    return getLocationsSortedWithCustom(customLocations);
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!(locationName.trim() && selectedAfterLocationId)) {
      return;
    }

    const newLocationId = await playthroughActions.addCustomLocation(
      locationName.trim(),
      selectedAfterLocationId,
    );

    if (newLocationId !== null) {
      handleClose();
    }
  };

  return (
    <Dialog
      className="group relative z-[70]"
      onClose={handleClose}
      open={isOpen}
    >
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50"
        transition
      />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          className={clsx(
            "w-full max-w-md space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transition duration-150 ease-out data-closed:scale-98 data-closed:opacity-0",
          )}
          transition
        >
          <div className="flex items-center justify-between">
            <DialogTitle className="text-gray-900 text-xl dark:text-white">
              Add Custom Location
            </DialogTitle>
            <button
              aria-label="Close modal"
              className={clsx(
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                "cursor-pointer rounded-md p-1 transition-colors",
              )}
              onClick={handleClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
            <div>
              <label
                className="mb-1 block text-gray-700 text-sm dark:text-gray-300"
                htmlFor="locationName"
              >
                Location Name
              </label>
              <input
                className={clsx(
                  "w-full rounded-md border px-3 py-2 transition-colors",
                  "border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-700",
                  "text-gray-900 dark:text-white",
                  "placeholder-gray-500 dark:placeholder-gray-400",
                  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "dark:focus:border-blue-400 dark:focus:ring-blue-400",
                )}
                id="locationName"
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g., Hidden Grotto, Secret Cave"
                required
                type="text"
                value={locationName}
              />
            </div>

            <div>
              <label
                className="mb-1 block text-gray-700 text-sm dark:text-gray-300"
                htmlFor="afterLocation"
              >
                Place After
              </label>
              <select
                className={clsx(
                  "w-full cursor-pointer rounded-md border px-3 py-2 transition-colors",
                  "border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-700",
                  "text-gray-900 dark:text-white",
                  "focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "dark:focus:border-blue-400 dark:focus:ring-blue-400",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                disabled={allLocations.length === 0}
                id="afterLocation"
                onChange={(e) => setSelectedAfterLocationId(e.target.value)}
                required
                value={selectedAfterLocationId}
              >
                <option value="">Select location to place after...</option>
                {allLocations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} (
                    {"region" in location ? location.region : "Custom"})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-row-reverse gap-x-3 pt-4">
              <button
                className={clsx(
                  "flex-1 rounded-md px-4 py-2 text-sm transition-colors",
                  "bg-blue-600 text-white hover:bg-blue-700",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                  "flex items-center justify-center space-x-2",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
                disabled={allLocations.length === 0}
                type="submit"
              >
                {allLocations.length === 0 ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                <span>Add Location</span>
              </button>
              <button
                className={clsx(
                  "flex-1 rounded-md px-4 py-2 text-sm transition-colors",
                  "bg-gray-100 text-gray-900 hover:bg-gray-200",
                  "dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                )}
                onClick={handleClose}
                type="button"
              >
                Cancel
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

"use client";
import {
  Description,
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Field,
  Label,
  Switch,
} from "@headlessui/react";
import clsx from "clsx";
import { Monitor, Moon, Move, Rabbit, Sun, X } from "lucide-react";
import { useTheme } from "next-themes";
import { useSnapshot } from "valtio";
import { useMounted } from "@/hooks/useMounted";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { settingsActions, settingsStore } from "@/stores/settings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const settings = useSnapshot(settingsStore);
  const reducedMotion = useReducedMotion(settings.reducedMotion);

  if (mounted === false) {
    return null;
  }

  return (
    <Dialog className="group relative z-[70]" onClose={onClose} open={isOpen}>
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
            <DialogTitle className="font-semibold text-gray-900 text-xl dark:text-white">
              Settings
            </DialogTitle>
            <button
              aria-label="Close modal"
              className={clsx(
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                "cursor-pointer rounded-md p-1 transition-colors",
              )}
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 rounded-md bg-gray-100 p-2 dark:bg-gray-800">
                  <Monitor className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 text-sm dark:text-white">
                    Theme
                  </h3>
                  <p className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                    Choose your preferred color scheme
                  </p>
                </div>
              </div>
              <div className="flex items-center rounded-md bg-gray-100 p-0.5 dark:bg-gray-800">
                {[
                  { icon: Monitor, label: "System", value: "system" },
                  { icon: Sun, label: "Light", value: "light" },
                  { icon: Moon, label: "Dark", value: "dark" },
                ].map(({ value, icon: Icon, label }) => (
                  <button
                    aria-label={label}
                    className={clsx(
                      "flex h-8 w-8 cursor-pointer items-center justify-center rounded transition-all duration-200",
                      theme === value
                        ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                        : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200",
                    )}
                    key={value}
                    onClick={() => setTheme(value)}
                    title={label}
                    type="button"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <Field className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 rounded-md bg-gray-100 p-2 dark:bg-gray-800">
                  <Move className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <Label className="font-medium text-gray-900 text-sm dark:text-white">
                    Move Encounters
                  </Label>
                  <Description className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                    Allow moving encounters between locations
                  </Description>
                </div>
              </div>
              <Switch
                checked={settings.moveEncountersBetweenLocations}
                className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-checked:bg-blue-600 dark:bg-gray-700"
                onChange={settingsActions.toggleMoveEncountersBetweenLocations}
              >
                <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
              </Switch>
            </Field>

            <Field className="flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 rounded-md bg-gray-100 p-2 dark:bg-gray-800">
                  <Rabbit className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <Label className="font-medium text-gray-900 text-sm dark:text-white">
                    Reduced Motion
                  </Label>
                  <Description className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                    Limit animations and smooth scrolling
                  </Description>
                </div>
              </div>
              <Switch
                checked={reducedMotion}
                className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-checked:bg-blue-600 dark:bg-gray-700"
                onChange={settingsActions.setReducedMotion}
              >
                <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
              </Switch>
            </Field>
          </div>

          <div className="flex justify-end pt-4">
            <button
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 font-medium text-sm text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              onClick={onClose}
              type="button"
            >
              Done
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

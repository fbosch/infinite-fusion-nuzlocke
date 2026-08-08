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
import { Cookie, X } from "lucide-react";
import { useState } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  type ConsentPreferences,
  consentPreferencesSchema,
  DEFAULT_CONSENT_PREFERENCES,
} from "@/lib/consentPreferences";

interface CookieSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CookieSettingsDialogProps {
  initialPreferences: ConsentPreferences;
  onClose: () => void;
  onSave: (value: ConsentPreferences) => void;
}

export function CookieSettings({ isOpen, onClose }: CookieSettingsProps) {
  const [preferences, setStoredPreferences] =
    useLocalStorage<ConsentPreferences>(
      "cookie-preferences",
      DEFAULT_CONSENT_PREFERENCES,
      consentPreferencesSchema,
    );

  if (isOpen === false) {
    return null;
  }

  return (
    <CookieSettingsDialog
      initialPreferences={preferences}
      onClose={onClose}
      onSave={setStoredPreferences}
    />
  );
}

function CookieSettingsDialog({
  initialPreferences,
  onSave,
  onClose,
}: CookieSettingsDialogProps) {
  const [localPreferences, setLocalPreferences] =
    useState<ConsentPreferences>(initialPreferences);

  const savePreferences = (newPreferences: ConsentPreferences) => {
    onSave(newPreferences);
    onClose();
  };

  const handlePreferenceChange = (
    key: keyof ConsentPreferences,
    value: boolean,
  ) => {
    setLocalPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <Dialog className="group relative z-[70]" onClose={onClose} open>
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100"
        transition
      />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          className={clsx(
            "w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transition duration-150 ease-out data-closed:scale-98 data-closed:opacity-0",
          )}
          transition
        >
          <div className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cookie className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                <DialogTitle className="text-gray-900 text-xl dark:text-white">
                  Cookie Preferences
                </DialogTitle>
              </div>
              <button
                aria-label="Close cookie settings"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                onClick={onClose}
                type="button"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 space-y-6">
              <div>
                <h3 className="mb-4 text-gray-900 text-lg dark:text-white">
                  Manage your cookie preferences
                </h3>
                <p className="mb-6 text-gray-600 text-sm dark:text-gray-300">
                  You can enable or disable different types of cookies below.
                  These settings will be saved to your browser and you can
                  change them at any time.
                </p>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <div className="mb-2 flex items-center justify-between">
                    <h4 className="text-gray-900 dark:text-white">
                      Essential Cookies
                    </h4>
                    <div className="text-gray-500 text-sm dark:text-gray-400">
                      Always Active
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm dark:text-gray-300">
                    These cookies are necessary for the website to function and
                    cannot be switched off. They are usually only set in
                    response to actions made by you.
                  </p>
                </div>

                <Field className="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-gray-900 dark:text-white">
                      Analytics Cookies
                    </Label>
                    <Switch
                      checked={localPreferences.analytics}
                      className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-checked:bg-blue-600 dark:bg-gray-700"
                      onChange={(checked) =>
                        handlePreferenceChange("analytics", checked)
                      }
                    >
                      <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
                    </Switch>
                  </div>
                  <Description className="text-gray-600 text-sm dark:text-gray-300">
                    These cookies help us understand how visitors interact with
                    our website by collecting and reporting information
                    anonymously.
                  </Description>
                </Field>

                <Field className="rounded-lg border border-gray-200 p-4 dark:border-gray-600">
                  <div className="mb-2 flex items-center justify-between">
                    <Label className="text-gray-900 dark:text-white">
                      Performance Cookies
                    </Label>
                    <Switch
                      checked={localPreferences.speedInsights}
                      className="group inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition data-checked:bg-blue-600 dark:bg-gray-700"
                      onChange={(checked) =>
                        handlePreferenceChange("speedInsights", checked)
                      }
                    >
                      <span className="size-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
                    </Switch>
                  </div>
                  <Description className="text-gray-600 text-sm dark:text-gray-300">
                    These cookies allow us to monitor and improve the
                    performance of our website by collecting information about
                    how the site is used.
                  </Description>
                </Field>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                className="flex-1 rounded-md bg-gray-200 px-4 py-3 text-gray-900 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                onClick={() => savePreferences(DEFAULT_CONSENT_PREFERENCES)}
                type="button"
              >
                Reject All
              </button>
              <button
                className="flex-1 rounded-md bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700"
                onClick={() => savePreferences(localPreferences)}
                type="button"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

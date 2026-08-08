"use client";

import { Cookie } from "lucide-react";
import { useState } from "react";
import { CookieSettings } from "@/components/analytics/CookieSettings";

export default function CookieSettingsButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Cookie preferences"
        className="flex items-center gap-1.5 rounded-sm border border-gray-300 bg-gray-100 px-2 py-1 text-gray-700 text-sm transition-colors duration-200 hover:bg-gray-300 hover:text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-white"
        onClick={() => setIsOpen(true)}
        title="Cookie preferences"
        type="button"
      >
        <Cookie className="h-4 w-4" />
        Cookie Settings
      </button>

      <CookieSettings isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

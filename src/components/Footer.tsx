"use client";

import Link from "next/link";
import { useState } from "react";
import CookieSettingsButton from "@/components/analytics/CookieSettingsButton";
import CreditsModal from "@/components/CreditsModal";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const appVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "unknown";
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  return (
    <footer className="mt-8 border-gray-200 border-t bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {/* Top section with button on left and links in center */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col justify-center space-x-6 md:flex-row">
              <a
                className="text-blue-600 text-sm transition-colors duration-200 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                href="https://discord.gg/infinitefusion"
                rel="noopener noreferrer"
                target="_blank"
              >
                Join Discord Community
              </a>
              <a
                className="text-blue-600 text-sm transition-colors duration-200 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                href="https://infinitefusion.fandom.com/wiki/Pok%C3%A9mon_Infinite_Fusion_Wiki"
                rel="noopener noreferrer"
                target="_blank"
              >
                Wiki
              </a>
              <a
                className="text-blue-600 text-sm transition-colors duration-200 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                href="https://infinitefusiondex.com/"
                rel="noopener noreferrer"
                target="_blank"
              >
                InfiniteDex
              </a>
              <a
                className="text-blue-600 text-sm transition-colors duration-200 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                href="https://www.fusiondex.org/"
                rel="noopener noreferrer"
                target="_blank"
              >
                FusionDex
              </a>
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <CookieSettingsButton />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="space-y-1 text-gray-600 text-sm md:text-center dark:text-gray-400">
            <p>
              Pokémon and Pokémon character names are trademarks of Nintendo.
            </p>
            <p>
              Pokémon character designs are © 1995–{currentYear} The Pokémon
              Company
            </p>
            <p>
              This website is not affiliated with The Pokémon Company, Nintendo,
              Game Freak Inc., or Creatures Inc.
            </p>
            <p>Version {appVersion}</p>
          </div>
          <div className="mt-2 md:text-center">
            <button
              aria-controls="credits-modal"
              aria-haspopup="dialog"
              className="cursor-pointer text-blue-600 text-sm transition-colors duration-200 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={() => setIsCreditsOpen(true)}
              type="button"
            >
              Credits
            </button>
            <span className="mx-2 text-gray-400">·</span>
            <Link
              className="text-blue-600 text-sm transition-colors duration-200 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              href="/licenses"
            >
              Open source licenses
            </Link>
          </div>
          <CreditsModal
            isOpen={isCreditsOpen}
            onClose={() => setIsCreditsOpen(false)}
          />
        </div>
      </div>
    </footer>
  );
}

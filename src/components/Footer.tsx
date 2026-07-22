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
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 mt-8">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          {/* Top section with button on left and links in center */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col md:flex-row justify-center space-x-6">
              <a
                href="https://discord.gg/infinitefusion"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm "
              >
                Join Discord Community
              </a>
              <a
                href="https://infinitefusion.fandom.com/wiki/Pok%C3%A9mon_Infinite_Fusion_Wiki"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm "
              >
                Wiki
              </a>
              <a
                href="https://infinitefusiondex.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm "
              >
                InfiniteDex
              </a>
              <a
                href="https://www.fusiondex.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm "
              >
                FusionDex
              </a>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <CookieSettingsButton />
            </div>
          </div>

          {/* Disclaimer */}
          <div className="md:text-center text-sm text-gray-600 dark:text-gray-400 space-y-1">
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
              onClick={() => setIsCreditsOpen(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm cursor-pointer"
              aria-haspopup="dialog"
              aria-controls="credits-modal"
            >
              Credits
            </button>
            <span className="mx-2 text-gray-400">·</span>
            <Link
              href="/licenses"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm"
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

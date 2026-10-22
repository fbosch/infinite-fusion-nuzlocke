"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import clsx from "clsx";
import { X } from "lucide-react";
import Link from "next/link";

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  return (
    <Dialog className="group relative z-[70]" onClose={onClose} open={isOpen}>
      <DialogBackdrop
        aria-hidden="true"
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/50"
        transition
      />

      <div className="fixed inset-0 flex w-screen items-center justify-center p-4">
        <DialogPanel
          aria-labelledby="credits-modal-title"
          className={clsx(
            "flex max-h-[80vh] w-full max-w-2xl flex-col space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transition duration-150 ease-out data-closed:scale-98 data-closed:opacity-0",
          )}
          id="credits-modal"
          transition
        >
          <div className="flex items-center justify-between">
            <DialogTitle
              className="font-semibold text-gray-900 text-xl dark:text-white"
              id="credits-modal-title"
            >
              Credits & Licensing
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

          <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto">
            <section className="space-y-2">
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                Data Sources & Credits
              </h3>
              <ul className="list-inside list-disc space-y-2 text-gray-700 text-sm dark:text-gray-300">
                <li>
                  <a
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    href="https://discord.gg/infinitefusion"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Pokemon Infinite Fusion Community
                  </a>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    All the fusion sprites are made by the community.
                  </span>
                </li>
                <li>
                  <a
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    href="https://infinitefusion.fandom.com/wiki/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Infinite Fusion Wiki (Fandom)
                  </a>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    Reference for wild encounters, special encounters,
                    locations, and related game info.
                  </span>
                </li>
                <li>
                  <a
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    href="https://pokeapi.co/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    PokéAPI
                  </a>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    Species data (types, evolution chains, metadata).
                  </span>
                </li>
                <li>
                  <a
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    href="https://infinitefusiondex.com/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Infinite Fusion Dex
                  </a>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    Datasource for fusion sprites and available variants.
                  </span>
                </li>
                <li>
                  <a
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    href="https://github.com/msikma/pokesprite"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    PokéSprite (msikma/pokesprite)
                  </a>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    Small Pokémon icon sprites.
                  </span>
                </li>
                <li>
                  <a
                    className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    href="https://www.fusiondex.org/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    FusionDex
                  </a>
                  <span className="ml-1 text-gray-600 dark:text-gray-400">
                    Custom sprite variants and artist attributions.
                  </span>
                </li>
              </ul>
            </section>

            <section className="mt-4 space-y-2">
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                Trademarks
              </h3>
              <p className="text-gray-600 text-sm dark:text-gray-300">
                Pokémon and related names are trademarks of their respective
                owners. This project is unaffiliated with Nintendo, Game Freak,
                Creatures Inc., or The Pokémon Company.
              </p>
            </section>
            <section className="mt-4 space-y-2">
              <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                Licensing
              </h3>
              <p className="text-gray-600 text-sm dark:text-gray-300">
                This project is licensed under the MIT License.
              </p>
              <Link
                className="text-blue-600 underline hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                href="/licenses"
                onClick={onClose}
              >
                View Open Source Licenses
              </Link>
            </section>
          </div>

          <div className="flex justify-end border-gray-200 border-t pt-4 dark:border-gray-700">
            <button
              className={clsx(
                "cursor-pointer rounded-md px-4 py-2 text-sm transition-colors",
                "bg-gray-100 text-gray-900 hover:bg-gray-200",
                "dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
              )}
              onClick={onClose}
              type="button"
            >
              Close
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

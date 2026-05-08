"use client";
import Link from "next/link";
import Logo from "@/components/Logo";
import PlaythroughMenu from "@/components/playthrough/PlaythroughMenu";
import TeamSlots from "@/components/team/TeamSlots";
import MenuItems from "./MenuItems";

export default function Header() {
  return (
    <div>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50"
      >
        Skip to main content
      </a>

      <div className="mx-auto max-w-[1500px] px-4 md:px-6 2xl:px-0">
        <header className="mb-2 py-2 sm:mb-4 sm:pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <div className="flex items-start justify-between gap-3 lg:flex-col lg:justify-start lg:gap-2">
              <Link
                href="/"
                className="flex min-w-0 items-center justify-start gap-3 drop-shadow-xs/5"
              >
                <Logo className="w-10 shrink-0 sm:w-12" />
                <div className="min-w-0 self-start">
                  <h1 className="text-sm font-medium tracking-[0.01em]">
                    <span className="whitespace-nowrap tracking-wide text-sky-800 dark:text-cyan-200">
                      Pokémon Infinite Fusion
                    </span>
                    <div className="text-base font-medium text-gray-800 sm:text-xl dark:text-white whitespace-nowrap">
                      Nuzlocke Tracker
                    </div>
                  </h1>
                </div>
              </Link>

              {/* Settings and PC buttons underneath logo */}
              <div className="flex shrink-0 items-center gap-1 lg:shrink">
                <MenuItems />
              </div>
            </div>

            {/* Team Slots */}
            <div className="hidden flex-1 justify-center pt-1.5 lg:flex">
              <TeamSlots />
            </div>

            <div className="flex w-full items-start lg:w-auto">
              <PlaythroughMenu />
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}

"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import PlaythroughMenu from "@/components/playthrough/PlaythroughMenu";
import TeamSlots from "@/components/team/TeamSlots";
import type { TopBarModal } from "./MenuItems";
import SettingsModal from "./SettingsModal";
import TopBar from "./TopBar";

const PokemonPCSheet = dynamic(() => import("@/components/pc/PokemonPCSheet"), {
  ssr: false,
});

export default function Header() {
  const pathname = usePathname();
  const [activeTopBarModal, setActiveTopBarModal] =
    useState<TopBarModal | null>(null);
  const [pcTab, setPCTab] = useState<"team" | "box" | "graveyard">("team");
  const githubCtaRoute: "home" | "locations" | null =
    pathname === "/" ? "home" : pathname === "/locations" ? "locations" : null;
  const topBarProps = {
    githubCtaRoute,
    onOpenModal: setActiveTopBarModal,
  };

  return (
    <div className="pt-10">
      <a
        className="sr-only z-[70] rounded-md bg-blue-600 px-4 py-2 text-white focus:not-sr-only focus:absolute focus:top-4 focus:left-4"
        href="#main-content"
      >
        Skip to main content
      </a>

      <TopBar {...topBarProps} />

      <SettingsModal
        isOpen={activeTopBarModal === "settings"}
        onClose={() => setActiveTopBarModal(null)}
      />
      <PokemonPCSheet
        activeTab={pcTab}
        isOpen={activeTopBarModal === "pc"}
        onChangeTab={setPCTab}
        onClose={() => setActiveTopBarModal(null)}
      />

      <div className="mx-auto max-w-[1500px] px-4 md:px-6 2xl:px-0">
        <header className="mb-2 py-2 sm:mb-4 sm:pt-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-4">
            <div className="flex items-start gap-3">
              <Link
                className="flex min-w-0 items-center justify-start gap-3 drop-shadow-xs/5"
                href="/"
              >
                <Logo className="w-10 shrink-0 sm:w-12" />
                <div className="min-w-0 self-start">
                  <h1 className="font-medium text-sm tracking-[0.01em]">
                    <span className="whitespace-nowrap text-sky-800 tracking-wide dark:text-cyan-200">
                      Pokémon Infinite Fusion
                    </span>
                    <div className="whitespace-nowrap font-medium text-base text-gray-800 sm:text-xl dark:text-white">
                      Nuzlocke Tracker
                    </div>
                  </h1>
                </div>
              </Link>
            </div>

            <div className="hidden flex-1 justify-center pt-1.5 lg:flex">
              <TeamSlots />
            </div>

            <div className="flex w-full flex-col items-stretch lg:w-auto">
              <PlaythroughMenu />
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}

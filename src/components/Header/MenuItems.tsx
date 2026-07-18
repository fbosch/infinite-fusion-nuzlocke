"use client";
import clsx from "clsx";
import { Computer, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";
import { CursorTooltip } from "@/components/CursorTooltip";
import SettingsModal from "./SettingsModal";

const PokemonPCSheet = dynamic(() => import("@/components/pc/PokemonPCSheet"), {
  ssr: false,
});

const menuActionClassName = clsx(
  "inline-flex h-10 w-10 items-center justify-center rounded-md lg:h-9 lg:w-9",
  "bg-transparent text-gray-500 dark:text-gray-400",
  "hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
  "transition-all duration-150 cursor-pointer",
  "border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500",
);

export default function MenuItems() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"team" | "box" | "graveyard">(
    "team",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleOpenDrawer = () => {
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
  };

  const menuActions = [
    {
      label: "Settings",
      description: "Configure app preferences and options",
      ariaLabel: "Open Settings",
      icon: Settings,
      onClick: () => setSettingsOpen(true),
    },
    {
      label: "Pokémon PC",
      description: "Manage your team, box, and graveyard",
      ariaLabel: "Open Pokémon PC",
      icon: Computer,
      onClick: handleOpenDrawer,
    },
  ];

  return (
    <>
      <div className="flex items-center gap-1 lg:mr-3">
        {menuActions.map(
          ({ label, description, ariaLabel, icon: Icon, onClick }) => (
            <CursorTooltip
              key={label}
              content={
                <div className="flex flex-col gap-1 min-w-32">
                  <div className="font-medium text-sm">{label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {description}
                  </div>
                </div>
              }
              delay={300}
            >
              <button
                type="button"
                className={menuActionClassName}
                aria-label={ariaLabel}
                onClick={onClick}
              >
                <Icon className="h-4 w-4" />
              </button>
            </CursorTooltip>
          ),
        )}
      </div>

      <PokemonPCSheet
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

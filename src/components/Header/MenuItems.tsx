"use client";
import clsx from "clsx";
import { Computer, Settings } from "lucide-react";
import { CursorTooltip } from "@/components/CursorTooltip";

const menuActionClassName = clsx(
  "inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-[3px] border text-xs font-semibold lg:w-auto lg:gap-1.5 lg:px-1.5",
  "border-[#d0d7de] bg-white text-gray-700 dark:border-[#30363d] dark:bg-[#1a1e23] dark:text-gray-300",
  "hover:bg-gray-100 dark:hover:bg-[#22262c]",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0969da] focus-visible:ring-offset-1",
  "transition-colors duration-150",
);

export type TopBarModal = "settings" | "pc";

type MenuItemsProps = {
  onOpenModal: (modal: TopBarModal) => void;
};

export default function MenuItems({ onOpenModal }: MenuItemsProps) {
  const menuActions = [
    {
      label: "Settings",
      description: "Configure app preferences and options",
      ariaLabel: "Open Settings",
      icon: Settings,
      onClick: () => onOpenModal("settings"),
      showLabel: false,
    },
    {
      label: "Pokémon PC",
      description: "Manage your team, box, and graveyard",
      ariaLabel: "Open Pokémon PC",
      icon: Computer,
      onClick: () => onOpenModal("pc"),
      showLabel: true,
    },
  ];

  return (
    <div className="flex items-center gap-1 lg:mr-3">
      {menuActions.map(
        ({ label, description, ariaLabel, icon: Icon, onClick, showLabel }) => (
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
              {showLabel && (
                <span className="hidden text-xs lg:inline">{label}</span>
              )}
            </button>
          </CursorTooltip>
        ),
      )}
    </div>
  );
}

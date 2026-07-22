"use client";

import { GitHubEngagementCta } from "@/components/GitHubEngagementCta";
import ThemeToggle from "@/components/ThemeToggle";
import MenuItems, { type TopBarModal } from "./MenuItems";

type TopBarProps = {
  githubCtaRoute: "home" | "locations" | null;
  onOpenModal: (modal: TopBarModal) => void;
};

export default function TopBar({ githubCtaRoute, onOpenModal }: TopBarProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto flex h-10 items-center gap-3 px-2 sm:px-3 md:px-4 2xl:px-0">
        <MenuItems onOpenModal={onOpenModal} />
        <div className="ml-auto flex items-center gap-3">
          {githubCtaRoute && (
            <GitHubEngagementCta key={githubCtaRoute} route={githubCtaRoute} />
          )}
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}

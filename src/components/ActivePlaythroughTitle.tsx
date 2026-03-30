"use client";

import { useActivePlaythrough } from "@/stores/playthroughs/hooks";

const HOME_TITLE = "Infinite Fusion Nuzlocke Tracker";

export function ActivePlaythroughTitle() {
  const activePlaythrough = useActivePlaythrough();
  const playthroughName = activePlaythrough?.name?.trim();
  const pageTitle = playthroughName
    ? `${playthroughName} | ${HOME_TITLE}`
    : HOME_TITLE;

  return <title>{pageTitle}</title>;
}

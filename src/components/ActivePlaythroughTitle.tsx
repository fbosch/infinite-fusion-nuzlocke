"use client";

import { useEffect } from "react";
import { getPlaythroughPageTitle } from "@/lib/metadata";
import { useActivePlaythrough } from "@/stores/playthroughs/hooks";

export function ActivePlaythroughTitle() {
  const activePlaythrough = useActivePlaythrough();
  const pageTitle = getPlaythroughPageTitle(activePlaythrough?.name);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return null;
}

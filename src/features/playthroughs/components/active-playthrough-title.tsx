"use client";

import { useEffect } from "react";
import { useActivePlaythrough } from "../model/hooks";
import { getPlaythroughPageTitle } from "../model/page-title";

export function ActivePlaythroughTitle() {
  const activePlaythrough = useActivePlaythrough();
  const pageTitle = getPlaythroughPageTitle(activePlaythrough?.name);

  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);

  return null;
}

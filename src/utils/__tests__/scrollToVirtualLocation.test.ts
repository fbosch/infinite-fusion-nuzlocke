/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { onScrollToLocation } from "@/lib/events";
import { scrollToLocationById } from "../scrollToLocation";

describe("scrollToLocationById", () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("delegates an unmounted virtual row to the location scroll handler", () => {
    const container = document.createElement("div");
    const table = document.createElement("table");
    table.setAttribute("aria-label", "Locations table");
    container.appendChild(table);
    document.body.appendChild(container);

    const handler = vi.fn();
    const unsubscribe = onScrollToLocation(handler);

    expect(
      scrollToLocationById("route-9", {
        behavior: "smooth",
        durationMs: 500,
        highlightUids: ["pokemon-1"],
      }),
    ).toBe(true);
    expect(handler).toHaveBeenCalledExactlyOnceWith({
      behavior: "smooth",
      durationMs: 500,
      highlightUids: ["pokemon-1"],
      locationId: "route-9",
    });

    unsubscribe();
  });
});

/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it } from "vitest";
import { clampMenuPosition } from "../ContextMenu";

describe("ContextMenu", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 300,
    });

    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 200,
    });
  });

  it("keeps the context menu inside the viewport near bottom-right edges", () => {
    expect(
      clampMenuPosition({ x: 280, y: 190 }, { width: 120, height: 80 }),
    ).toEqual({ x: 172, y: 112 });
  });

  it("keeps the requested position when enough viewport space exists", () => {
    expect(
      clampMenuPosition({ x: 100, y: 60 }, { width: 120, height: 80 }),
    ).toEqual({ x: 100, y: 60 });
  });
});

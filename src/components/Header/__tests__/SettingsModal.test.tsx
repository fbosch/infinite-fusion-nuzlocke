/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SettingsModal from "../SettingsModal";

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}));

vi.mock("@/hooks/useMounted", () => ({
  useMounted: () => true,
}));

vi.mock("@/stores/settings", async () => {
  const { proxy } = await import("valtio");
  const settingsStore = proxy({
    moveEncountersBetweenLocations: false,
    reducedMotion: undefined as boolean | undefined,
  });

  return {
    settingsStore,
    settingsActions: {
      setReducedMotion: (reducedMotion: boolean) => {
        settingsStore.reducedMotion = reducedMotion;
      },
      toggleMoveEncountersBetweenLocations: () => {
        settingsStore.moveEncountersBetweenLocations =
          !settingsStore.moveEncountersBetweenLocations;
      },
    },
  };
});

describe("SettingsModal", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it.each([true, false])(
    "initially reflects the browser reduced-motion preference (%s)",
    (matches) => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn().mockReturnValue({
          matches,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        }),
      );

      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);

      expect(
        screen
          .getByRole("switch", { name: "Reduced Motion" })
          .getAttribute("aria-checked"),
      ).toBe(String(matches));
    },
  );
});

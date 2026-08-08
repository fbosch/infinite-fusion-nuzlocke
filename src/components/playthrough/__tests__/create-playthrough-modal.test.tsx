/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import CreatePlaythroughModal from "../CreatePlaythroughModal";

vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

describe("CreatePlaythroughModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("creates a randomized playthrough when game mode is unchanged", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);

    render(
      <CreatePlaythroughModal
        isOpen={true}
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );

    fireEvent.change(screen.getByLabelText("Playthrough Name"), {
      target: { value: "Randomized Run" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Playthrough" }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith("Randomized Run", "randomized");
    });
  });
});

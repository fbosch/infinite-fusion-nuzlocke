/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TeamMemberPickerModal from "../team-member-picker-modal";

vi.mock("@/features/playthroughs", () => ({
  useActivePlaythrough: () => ({ id: "playthrough-1" }),
}));

vi.mock("@/features/roster/components/team-member-selection-context", () => ({
  TeamMemberSelectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("@/features/roster/components/team-member-selection-panel", () => ({
  TeamMemberSelectionPanel: () => <div>Selection panel</div>,
}));

vi.mock("@/features/roster/components/team-member-preview-panel", () => ({
  TeamMemberPreviewPanel: () => <div>Preview panel</div>,
}));

describe("TeamMemberPickerModal layering", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders above the PC sidebar layer", () => {
    render(
      <TeamMemberPickerModal
        isOpen
        onClose={vi.fn()}
        onSelect={vi.fn().mockResolvedValue(true)}
        position={2}
      />,
    );

    expect(screen.getByRole("dialog").className).toContain("z-[80]");
    expect(
      document.getElementById("team-member-picker-modal")?.parentElement
        ?.className,
    ).toContain("z-[81]");
  });
});

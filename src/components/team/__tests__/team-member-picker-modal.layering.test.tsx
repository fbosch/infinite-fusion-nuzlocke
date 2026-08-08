/** @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import TeamMemberPickerModal from "@/components/team/TeamMemberPickerModal";

vi.mock("@/stores/playthroughs/hooks", () => ({
  useActivePlaythrough: () => ({ id: "playthrough-1" }),
}));

vi.mock("@/components/team/TeamMemberSelectionContext", () => ({
  TeamMemberSelectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("@/components/team/TeamMemberSelectionPanel", () => ({
  TeamMemberSelectionPanel: () => <div>Selection panel</div>,
}));

vi.mock("@/components/team/TeamMemberPreviewPanel", () => ({
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

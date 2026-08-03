/** @vitest-environment jsdom */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTeamMemberPicker } from "../useTeamMemberPicker";

const updateTeamMemberMock = vi.hoisted(() => vi.fn());

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: { updateTeamMember: updateTeamMemberMock },
}));

const pokemon = {
  id: 25,
  name: "Pikachu",
  uid: "pikachu-uid",
  nationalDexId: 25,
};

describe("useTeamMemberPicker", () => {
  beforeEach(() => {
    updateTeamMemberMock.mockReset();
  });

  it("updates the selected slot with UID references and closes after success", async () => {
    updateTeamMemberMock.mockResolvedValue(true);
    const { result } = renderHook(() => useTeamMemberPicker());

    await act(() => result.current.selectTeamMember(pokemon, null));
    expect(updateTeamMemberMock).not.toHaveBeenCalled();

    act(() => result.current.openPicker(2));
    expect(result.current.pickerModalOpen).toBe(true);

    await act(() => result.current.selectTeamMember(pokemon, null));

    expect(updateTeamMemberMock).toHaveBeenCalledWith(
      2,
      { uid: "pikachu-uid" },
      null,
    );
    expect(result.current.pickerModalOpen).toBe(false);
    expect(result.current.selectedPosition).toBeNull();
  });

  it("keeps the picker open when the validated update fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    updateTeamMemberMock.mockResolvedValue(false);
    const { result } = renderHook(() => useTeamMemberPicker());

    act(() => result.current.openPicker(1));
    await act(() => result.current.selectTeamMember(null, pokemon));

    expect(updateTeamMemberMock).toHaveBeenCalledWith(1, null, {
      uid: "pikachu-uid",
    });
    expect(result.current.pickerModalOpen).toBe(true);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to update team member at position:",
      1,
    );
    consoleError.mockRestore();
  });
});

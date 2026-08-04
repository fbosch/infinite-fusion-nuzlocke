/** @vitest-environment jsdom */

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dragActions } from "@/stores/dragStore";
import { FusionToggleButton } from "../FusionToggleButton";

const {
  clearEncounterFromLocationMock,
  createFusionMock,
  fetchQueryMock,
  getLocationFromComboboxIdMock,
} = vi.hoisted(() => ({
  clearEncounterFromLocationMock: vi.fn(),
  createFusionMock: vi.fn(),
  fetchQueryMock: vi.fn(),
  getLocationFromComboboxIdMock: vi.fn(),
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("@/components/CursorTooltip", () => ({
  CursorTooltip: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ fetchQuery: fetchQueryMock }),
}));

vi.mock("@/lib/queries/pokemon", () => ({
  pokemonQueries: {
    all: () => ({ queryKey: ["pokemon", "all"] }),
  },
}));

vi.mock("@/loaders/pokemon", () => ({
  isEgg: () => false,
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: {
    clearEncounterFromLocation: clearEncounterFromLocationMock,
    createFusion: createFusionMock,
    getLocationFromComboboxId: getLocationFromComboboxIdMock,
  },
}));

describe("FusionToggleButton", () => {
  beforeEach(() => {
    fetchQueryMock.mockResolvedValue([
      { id: 25, name: "Pikachu", nationalDexId: 25 },
    ]);
  });

  afterEach(() => {
    cleanup();
    dragActions.clearDrag();
    vi.clearAllMocks();
  });

  it("uses the active drag state and preserves its source through async fusion", async () => {
    let resolveFusion: () => void;
    createFusionMock.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveFusion = resolve;
        }),
    );
    getLocationFromComboboxIdMock.mockReturnValue({
      locationId: "route-2",
      field: "single",
    });
    clearEncounterFromLocationMock.mockResolvedValue(undefined);
    dragActions.startDrag("Pikachu", "route-2-single", {
      id: 25,
      name: "Pikachu",
      nationalDexId: 25,
      originalLocation: "Route 2",
      nickname: "Sparky",
      status: "captured",
      uid: "pikachu-1",
    });

    render(
      <FusionToggleButton
        locationId="route-1"
        isFusion={false}
        selectedPokemon={{ id: 1, name: "Bulbasaur", nationalDexId: 1 }}
        onToggleFusion={vi.fn()}
      />,
    );

    expect(fetchQueryMock).not.toHaveBeenCalled();

    fireEvent.drop(screen.getByRole("button"), {
      dataTransfer: { getData: () => "Pikachu" },
    });

    expect(fetchQueryMock).toHaveBeenCalledWith({
      queryKey: ["pokemon", "all"],
    });

    await waitFor(() => {
      expect(createFusionMock).toHaveBeenCalledWith(
        "route-1",
        { id: 1, name: "Bulbasaur", nationalDexId: 1 },
        expect.objectContaining({
          originalLocation: "Route 2",
          nickname: "Sparky",
          status: "captured",
          uid: "pikachu-1",
        }),
      );
    });

    dragActions.clearDrag();
    resolveFusion!();

    await waitFor(() => {
      expect(getLocationFromComboboxIdMock).toHaveBeenCalledWith(
        "route-2-single",
      );
      expect(clearEncounterFromLocationMock).toHaveBeenCalledWith(
        "route-2",
        "single",
        { preserveTeamMembership: true },
      );
    });
  });
});

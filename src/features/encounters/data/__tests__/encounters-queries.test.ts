import { beforeEach, describe, expect, it, vi } from "vitest";
import { EncounterSource } from "../../model/encounters";
import encountersApiService from "../encounters-api-service";
import { encountersQueries } from "../encounters-queries";

vi.mock("../encounters-api-service", () => ({
  default: {
    getEncounters: vi.fn(),
  },
}));

describe("encountersQueries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the validated encounter collection without a transport wrapper", async () => {
    const encounters = [
      {
        pokemon: [{ id: 1, source: EncounterSource.WILD }],
        routeName: "Route 1",
      },
    ];
    vi.mocked(encountersApiService.getEncounters).mockResolvedValue(encounters);

    const result = await encountersQueries
      .all("classic")
      .queryFn?.({} as never);

    expect(result).toEqual(encounters);
    expect(encountersApiService.getEncounters).toHaveBeenCalledWith("classic");
  });
});

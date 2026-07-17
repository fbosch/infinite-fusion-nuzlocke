import { beforeEach, describe, expect, it, vi } from "vitest";
import encountersApiService from "@/services/encountersApiService";
import { EncounterSource } from "@/types/encounters";
import { encountersQueries } from "./encounters";

vi.mock("@/services/encountersApiService", () => ({
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
        routeName: "Route 1",
        pokemon: [{ id: 1, source: EncounterSource.WILD }],
      },
    ];
    vi.mocked(encountersApiService.getEncounters).mockResolvedValue(encounters);

    const result = await encountersQueries.all("classic").queryFn!({} as never);

    expect(result).toEqual(encounters);
    expect(encountersApiService.getEncounters).toHaveBeenCalledWith("classic");
  });
});

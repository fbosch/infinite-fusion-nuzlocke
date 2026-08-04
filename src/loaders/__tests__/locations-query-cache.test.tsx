/** @vitest-environment jsdom */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it } from "vitest";
import { getLocations, useLocationEncountersById } from "../locations";

describe("useLocationEncountersById", () => {
  it("ignores a malformed persisted encounters query", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const location = getLocations().find((item) => item.name === "Route 1");

    queryClient.setQueryData(["encounters", "all", "classic"], {
      staleCacheEntry: true,
    });

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useLocationEncountersById(location?.id, "classic"),
      { wrapper },
    );

    expect(result.current.pokemonEncounters).toEqual([]);
  });

  it("does not fetch encounters without a location ID", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    renderHook(() => useLocationEncountersById(undefined, "classic"), {
      wrapper,
    });

    expect(
      queryClient.getQueryState(["encounters", "all", "classic"])?.fetchStatus,
    ).toBe("idle");
  });
});

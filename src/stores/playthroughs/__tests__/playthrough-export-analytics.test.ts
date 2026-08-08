import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaythroughImportExport } from "@/hooks/usePlaythroughImportExport";
import type { Playthrough } from "@/stores/playthroughs/types";

const analyticsMocks = vi.hoisted(() => ({
  getSharedEventProperties: vi.fn(),
  trackEvent: vi.fn(),
}));

const playthroughActionMocks = vi.hoisted(() => ({
  getActivePlaythrough: vi.fn(),
  getAllPlaythroughs: vi.fn(),
  importPlaythrough: vi.fn(),
}));

vi.mock("@/stores/playthroughs/index", () => ({
  playthroughActions: playthroughActionMocks,
}));

vi.mock("@/lib/analytics/selectors", () => ({
  getSharedEventProperties: analyticsMocks.getSharedEventProperties,
}));

vi.mock("@/lib/analytics/trackEvent", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

const sharedProperties = {
  boxed_count_bucket: "c_0",
  deceased_count_bucket: "c_0",
  encounter_count_bucket: "e_1",
  fusion_count_bucket: "c_0",
  game_mode: "classic",
  playthrough_id: "playthrough-1",
  viable_roster_bucket: "v_1",
} as const;

const createPlaythrough = (): Playthrough => ({
  createdAt: 1,
  encounters: {},
  gameMode: "classic",
  id: "playthrough-1",
  name: "Test Run",
  team: { members: [null, null, null, null, null, null] },
  updatedAt: 1,
  version: "1.0.0",
});

describe("usePlaythroughImportExport lifecycle analytics", () => {
  const basePlaythrough = createPlaythrough();

  const originalCreateElement = document.createElement.bind(document);

  const mockInputCreation = () => {
    const input = {
      accept: "",
      click: vi.fn(),
      files: null,
      onchange: null,
      remove: vi.fn(),
      type: "",
    } as unknown as HTMLInputElement;

    const createElementSpy = vi
      .spyOn(document, "createElement")
      .mockImplementation(((
        tagName: string,
        options?: ElementCreationOptions,
      ) => {
        if (tagName === "input") {
          return input as unknown as HTMLElement;
        }

        return originalCreateElement(tagName, options);
      }) as typeof document.createElement);

    return { createElementSpy, input };
  };

  const triggerInputChange = async (input: HTMLInputElement, file: File) => {
    await act(async () => {
      if (!input.onchange) {
        throw new Error("Expected input onchange handler to be set");
      }

      await input.onchange({
        target: {
          files: [file],
        },
      } as unknown as Event);
    });
  };

  beforeEach(() => {
    analyticsMocks.trackEvent.mockReset();
    analyticsMocks.getSharedEventProperties.mockReset();
    analyticsMocks.getSharedEventProperties.mockReturnValue(sharedProperties);
    playthroughActionMocks.importPlaythrough.mockReset();
    playthroughActionMocks.getActivePlaythrough.mockReset();
    playthroughActionMocks.getAllPlaythroughs.mockReset();

    playthroughActionMocks.getActivePlaythrough.mockReturnValue(
      basePlaythrough,
    );
    playthroughActionMocks.getAllPlaythroughs.mockReturnValue([
      basePlaythrough,
    ]);
  });

  it("tracks playthrough_exported after successful export", () => {
    const playthrough = createPlaythrough();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(vi.fn());
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(vi.fn());

    const { result } = renderHook(() => usePlaythroughImportExport());

    act(() => {
      result.current.handleExportClick(playthrough, {
        preventDefault,
        stopPropagation,
      } as unknown as React.MouseEvent);
    });

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopPropagation).toHaveBeenCalledTimes(1);
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "playthrough_exported",
      sharedProperties,
    );

    clickSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  });

  it("does not track playthrough_exported when export fails", () => {
    const playthrough = createPlaythrough();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockImplementation(() => {
        throw new Error("blob failure");
      });

    const { result } = renderHook(() => usePlaythroughImportExport());

    act(() => {
      result.current.handleExportClick(playthrough, {
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
      } as unknown as React.MouseEvent);
    });

    expect(analyticsMocks.trackEvent).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
  });

  it("tracks playthrough_imported after successful import", async () => {
    const { input, createElementSpy } = mockInputCreation();
    const importedPlaythrough = {
      ...basePlaythrough,
      id: "imported-playthrough",
    };
    const importFile = {
      name: "save.json",
      text: vi.fn().mockResolvedValue('{"playthrough":{}}'),
      type: "application/json",
    } as unknown as File;

    playthroughActionMocks.importPlaythrough.mockResolvedValue(
      importedPlaythrough.id,
    );
    playthroughActionMocks.getActivePlaythrough.mockReturnValue(
      importedPlaythrough,
    );

    const { result } = renderHook(() => usePlaythroughImportExport());

    await act(async () => {
      await result.current.handleImportClick();
    });

    await triggerInputChange(input, importFile);

    expect(playthroughActionMocks.importPlaythrough).toHaveBeenCalledWith({
      playthrough: {},
    });
    expect(playthroughActionMocks.getAllPlaythroughs).not.toHaveBeenCalled();
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "playthrough_imported",
      {
        ...sharedProperties,
        file_extension_group: "json",
        import_source: "file_picker",
        mime_group: "application_json",
      },
    );

    createElementSpy.mockRestore();
  });

  it("tracks file-selection failures with normalized taxonomy", async () => {
    const { input, createElementSpy } = mockInputCreation();
    const invalidFile = {
      name: "save.txt",
      text: vi.fn().mockResolvedValue("not-used"),
      type: "text/plain",
    } as unknown as File;

    const { result } = renderHook(() => usePlaythroughImportExport());

    await act(async () => {
      await result.current.handleImportClick();
    });

    await triggerInputChange(input, invalidFile);

    expect(playthroughActionMocks.importPlaythrough).not.toHaveBeenCalled();
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "playthrough_import_failed",
      {
        ...sharedProperties,
        error_category: "unsupported_file_type",
        failure_stage: "file_selection",
        file_extension_group: "other",
        has_file: true,
        import_source: "file_picker",
        mime_group: "text_plain",
      },
    );

    createElementSpy.mockRestore();
  });

  it("tracks json parse failures with normalized taxonomy", async () => {
    const { input, createElementSpy } = mockInputCreation();
    const malformedJsonFile = {
      name: "save.json",
      text: vi.fn().mockResolvedValue("{oops"),
      type: "application/json",
    } as unknown as File;

    const { result } = renderHook(() => usePlaythroughImportExport());

    await act(async () => {
      await result.current.handleImportClick();
    });

    await triggerInputChange(input, malformedJsonFile);

    expect(playthroughActionMocks.importPlaythrough).not.toHaveBeenCalled();
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "playthrough_import_failed",
      {
        ...sharedProperties,
        error_category: "invalid_json",
        failure_stage: "json_parse",
        file_extension_group: "json",
        has_file: true,
        import_source: "file_picker",
        mime_group: "application_json",
      },
    );

    createElementSpy.mockRestore();
  });

  it("tracks schema-validation failures with normalized taxonomy", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(vi.fn());
    const { input, createElementSpy } = mockInputCreation();
    const validJsonFile = {
      name: "save.json",
      text: vi.fn().mockResolvedValue('{"playthrough":{}}'),
      type: "application/json",
    } as unknown as File;

    playthroughActionMocks.importPlaythrough.mockRejectedValue(
      new Error("Validation failed:\n\n- invalid schema"),
    );

    const { result } = renderHook(() => usePlaythroughImportExport());

    await act(async () => {
      await result.current.handleImportClick();
    });

    await triggerInputChange(input, validJsonFile);

    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "playthrough_import_failed",
      {
        ...sharedProperties,
        error_category: "invalid_schema",
        failure_stage: "schema_validation",
        file_extension_group: "json",
        has_file: true,
        import_source: "file_picker",
        mime_group: "application_json",
      },
    );

    consoleErrorSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});

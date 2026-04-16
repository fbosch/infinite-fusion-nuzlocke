import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePlaythroughImportExport } from "@/hooks/usePlaythroughImportExport";
import type { Playthrough } from "@/stores/playthroughs/types";

const analyticsMocks = vi.hoisted(() => ({
  getSharedEventProperties: vi.fn(),
  trackEvent: vi.fn(),
}));

const playthroughActionMocks = vi.hoisted(() => ({
  importPlaythrough: vi.fn(),
  getActivePlaythrough: vi.fn(),
  getAllPlaythroughs: vi.fn(),
}));

vi.mock("@/stores/playthroughs", () => ({
  playthroughActions: playthroughActionMocks,
}));

vi.mock("@/lib/analytics/selectors", () => ({
  getSharedEventProperties: analyticsMocks.getSharedEventProperties,
}));

vi.mock("@/lib/analytics/trackEvent", () => ({
  trackEvent: analyticsMocks.trackEvent,
}));

const sharedProperties = {
  playthrough_id: "playthrough-1",
  game_mode: "classic",
  encounter_count_bucket: "e_1",
  deceased_count_bucket: "c_0",
  boxed_count_bucket: "c_0",
  fusion_count_bucket: "c_0",
  viable_roster_bucket: "v_1",
} as const;

const createPlaythrough = (): Playthrough => ({
  id: "playthrough-1",
  name: "Test Run",
  gameMode: "classic",
  encounters: {},
  team: { members: [null, null, null, null, null, null] },
  createdAt: 1,
  updatedAt: 1,
  version: "1.0.0",
});

describe("usePlaythroughImportExport lifecycle analytics", () => {
  const basePlaythrough = createPlaythrough();

  const originalCreateElement = document.createElement.bind(document);

  const mockInputCreation = () => {
    const input = {
      type: "",
      accept: "",
      onchange: null,
      click: vi.fn(),
      remove: vi.fn(),
      files: null,
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

    return { input, createElementSpy };
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
      .mockImplementation(() => {});
    const createObjectUrlSpy = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:test");
    const revokeObjectUrlSpy = vi
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => {});

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
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
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
      type: "application/json",
      text: vi.fn().mockResolvedValue('{"playthrough":{}}'),
    } as unknown as File;

    playthroughActionMocks.importPlaythrough.mockResolvedValue(
      importedPlaythrough.id,
    );
    playthroughActionMocks.getAllPlaythroughs.mockReturnValue([
      basePlaythrough,
      importedPlaythrough,
    ]);

    const { result } = renderHook(() => usePlaythroughImportExport());

    await act(async () => {
      await result.current.handleImportClick();
    });

    await triggerInputChange(input, importFile);

    expect(playthroughActionMocks.importPlaythrough).toHaveBeenCalledWith({
      playthrough: {},
    });
    expect(analyticsMocks.trackEvent).toHaveBeenCalledWith(
      "playthrough_imported",
      {
        ...sharedProperties,
        import_source: "file_picker",
        file_extension_group: "json",
        mime_group: "application_json",
      },
    );

    createElementSpy.mockRestore();
  });

  it("tracks file-selection failures with normalized taxonomy", async () => {
    const { input, createElementSpy } = mockInputCreation();
    const invalidFile = {
      name: "save.txt",
      type: "text/plain",
      text: vi.fn().mockResolvedValue("not-used"),
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
        import_source: "file_picker",
        failure_stage: "file_selection",
        error_category: "unsupported_file_type",
        has_file: true,
        file_extension_group: "other",
        mime_group: "text_plain",
      },
    );

    createElementSpy.mockRestore();
  });

  it("tracks json parse failures with normalized taxonomy", async () => {
    const { input, createElementSpy } = mockInputCreation();
    const malformedJsonFile = {
      name: "save.json",
      type: "application/json",
      text: vi.fn().mockResolvedValue("{oops"),
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
        import_source: "file_picker",
        failure_stage: "json_parse",
        error_category: "invalid_json",
        has_file: true,
        file_extension_group: "json",
        mime_group: "application_json",
      },
    );

    createElementSpy.mockRestore();
  });

  it("tracks schema-validation failures with normalized taxonomy", async () => {
    const { input, createElementSpy } = mockInputCreation();
    const validJsonFile = {
      name: "save.json",
      type: "application/json",
      text: vi.fn().mockResolvedValue('{"playthrough":{}}'),
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
        import_source: "file_picker",
        failure_stage: "schema_validation",
        error_category: "invalid_schema",
        has_file: true,
        file_extension_group: "json",
        mime_group: "application_json",
      },
    );

    createElementSpy.mockRestore();
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  formatScriptError,
  isDirectScriptExecution,
  runDirectScript,
} from "../scripts/utils/script-runtime-utils";

describe("script runtime utilities", () => {
  it("formats known and unknown script failures", () => {
    expect(
      formatScriptError("Scraping failed", new Error("network down")),
    ).toBe("Scraping failed: network down");
    expect(formatScriptError("Scraping failed", "network down")).toBe(
      "Scraping failed: Unknown error",
    );
  });

  it("identifies only the direct script entrypoint", () => {
    expect(
      isDirectScriptExecution(
        "file:///workspace/scripts/scrape-wild-encounters.ts",
        "/workspace/scripts/scrape-wild-encounters.ts",
      ),
    ).toBe(true);
    expect(
      isDirectScriptExecution(
        "file:///workspace/scripts/scrape-wild-encounters.ts",
        "/workspace/tests/scrape-wild-encounters.test.ts",
      ),
    ).toBe(false);
  });

  it("starts only direct-entry script modules", () => {
    const main = vi.fn().mockResolvedValue(undefined);

    runDirectScript(
      "file:///workspace/scripts/scrape-wild-encounters.ts",
      main,
      "/workspace/scripts/scrape-wild-encounters.ts",
    );

    expect(main).toHaveBeenCalledOnce();
  });
});

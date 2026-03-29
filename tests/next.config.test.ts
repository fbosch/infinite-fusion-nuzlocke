import { afterEach, describe, expect, it, vi } from "vitest";
import packageJson from "../package.json";

const originalVersion = process.env.NEXT_PUBLIC_APP_VERSION;

describe("next.config", () => {
  afterEach(() => {
    vi.resetModules();

    if (originalVersion === undefined) {
      delete process.env.NEXT_PUBLIC_APP_VERSION;
      return;
    }

    process.env.NEXT_PUBLIC_APP_VERSION = originalVersion;
  });

  it("uses package.json version when NEXT_PUBLIC_APP_VERSION is unset", async () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;

    const nextConfigModule = await import("../next.config");
    const nextConfig = nextConfigModule.default as {
      env?: Record<string, string>;
    };

    expect(nextConfig.env?.NEXT_PUBLIC_APP_VERSION).toBe(packageJson.version);
  });

  it("prefers NEXT_PUBLIC_APP_VERSION when set", async () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "9.9.9-test";

    const nextConfigModule = await import("../next.config");
    const nextConfig = nextConfigModule.default as {
      env?: Record<string, string>;
    };

    expect(nextConfig.env?.NEXT_PUBLIC_APP_VERSION).toBe("9.9.9-test");
  });
});

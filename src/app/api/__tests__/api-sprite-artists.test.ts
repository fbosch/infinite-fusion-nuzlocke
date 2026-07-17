import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/sprite/artists/route";

const request = (id?: string) =>
  new NextRequest(
    `http://localhost:3000/api/sprite/artists${id ? `?id=${id}` : ""}`,
  );

describe("Sprite artists API", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns base and gallery artist credits", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            '<article class="dex-entry sprite-variant-main"><figcaption><span class="artists"><a>Base artist</a></span></figcaption><article class="sprite-preview"><a href="/sprite/pif/25.1a/"><figcaption><span class="artists"><a>Gallery artist</a></span></figcaption></article>',
          ),
        ),
    );

    const response = await GET(request("25.1"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      "25.1": ["Base artist"],
      "25.1a": ["Gallery artist"],
    });
  });

  it("rejects missing IDs", async () => {
    const response = await GET(request());

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "ID parameter is required",
    });
  });

  it("preserves upstream failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    );

    const response = await GET(request("25"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Failed to fetch page: 503",
    });
  });

  it("reports pages without credits", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html></html>")),
    );

    const response = await GET(request("25"));

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: "No artist credits found on page",
    });
  });
});

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

describe("GET /api/sprite/variants", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects an invalid id without probing the CDN", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await GET(
      new NextRequest("http://localhost/api/sprite/variants?id=invalid"),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns independently readable responses for concurrent requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const request = new NextRequest(
      "http://localhost/api/sprite/variants?id=25",
    );
    const [firstResponse, secondResponse] = await Promise.all([
      GET(request),
      GET(request),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    await expect(firstResponse.json()).resolves.toMatchObject({ variants: [] });
    await expect(secondResponse.json()).resolves.toMatchObject({
      variants: [],
    });
  });
});

import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET, OPTIONS } from "@/app/api/pokemon/route";

describe("Pokemon API", () => {
  it("filters the canonical collection in request order", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost:3000/api/pokemon?ids=25,-1&search=egg&type=normal&limit=1",
      ),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      count: 1,
      total: expect.any(Number),
      data: [{ id: -1, name: "Egg" }],
    });
  });

  it("rejects invalid query input", async () => {
    const response = await GET(
      new NextRequest("http://localhost:3000/api/pokemon?limit=invalid"),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Invalid query parameters",
    });
  });

  it("keeps the same-origin OPTIONS contract", async () => {
    const response = await OPTIONS();

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "same-origin",
    );
  });
});

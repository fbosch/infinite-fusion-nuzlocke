import type { NextRequest } from "next/server";
import { getSpriteArtistsResponse } from "@/features/pokemon/server";

export async function GET(request: NextRequest) {
  return await getSpriteArtistsResponse(request);
}

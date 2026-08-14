import type { NextRequest } from "next/server";
import { getEncountersResponse } from "@/features/encounters/server";

// Enable ISR caching - revalidate every hour
export const revalidate = 3600;

export function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return getEncountersResponse(searchParams.get("gameMode"));
}

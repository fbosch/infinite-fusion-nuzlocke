import type { NextRequest } from "next/server";
import {
  getSpriteVariantsOptionsResponse,
  getSpriteVariantsResponse,
} from "@/features/pokemon/server";

export const revalidate = 86_400;

export function GET(request: NextRequest) {
  return getSpriteVariantsResponse(request);
}

export function OPTIONS() {
  return getSpriteVariantsOptionsResponse();
}

import type { NextRequest } from "next/server";
import {
  getPokemonOptionsResponse,
  getPokemonResponse,
} from "@/features/pokemon/server";

export function GET(request: NextRequest) {
  return getPokemonResponse(request);
}

export function OPTIONS() {
  return getPokemonOptionsResponse();
}

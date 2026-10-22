import { NextResponse } from "next/server";
import { z } from "zod";
import { processGameModeData } from "./encounters-processor";

export function getEncountersResponse(rawGameMode: string | null) {
  try {
    const gameMode = rawGameMode === "remix" ? "remix" : "classic";
    const processedData = processGameModeData(gameMode);
    const isDevelopment = process.env.NODE_ENV === "development";

    return NextResponse.json(processedData, {
      headers: {
        "Cache-Control": isDevelopment
          ? "public, max-age=30"
          : "public, max-age=3600",
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error loading encounters:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { details: error.issues, error: "Invalid encounters data format" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "Failed to load encounters data" },
      { status: 500 },
    );
  }
}

import { getCacheBuster } from "@/lib/persistence";
import {
  type RouteEncounter,
  RouteEncountersArraySchema,
} from "@/types/encounters";

class EncountersApiService {
  private baseUrl: string;

  constructor() {
    // Use absolute URL in test environment, relative in browser
    this.baseUrl =
      typeof window === "undefined"
        ? "http://localhost:3000/api/encounters"
        : "/api/encounters";
  }

  private async makeRequest(
    gameMode: "classic" | "remix",
  ): Promise<RouteEncounter[]> {
    const searchParams = new URLSearchParams();
    searchParams.append("gameMode", gameMode);

    // Add cache busting version parameter
    searchParams.append("v", getCacheBuster().toString());

    const url = `${this.baseUrl}?${searchParams.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Encounters API error: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();

    // Validate the response
    const validatedData = RouteEncountersArraySchema.safeParse(data);

    if (!validatedData.success) {
      console.error("Invalid API response:", validatedData.error.issues);
      throw new Error("Invalid API response format");
    }

    return validatedData.data;
  }

  async getEncounters(
    gameMode: "classic" | "remix",
  ): Promise<RouteEncounter[]> {
    return await this.makeRequest(gameMode);
  }

  async getEncounterByRouteName(
    routeName: string,
    gameMode: "classic" | "remix",
  ): Promise<RouteEncounter | null> {
    const encounters = await this.getEncounters(gameMode);
    return (
      encounters.find((encounter) => encounter.routeName === routeName) || null
    );
  }

  async getEncountersCount(gameMode: "classic" | "remix"): Promise<number> {
    return (await this.makeRequest(gameMode)).length;
  }
}

// Export a singleton instance
const encountersApiService = new EncountersApiService();
export default encountersApiService;

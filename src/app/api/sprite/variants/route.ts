import { type NextRequest, NextResponse } from "next/server";
import {
  generateSpriteVariantUrl,
  getSpriteVariantSuffix,
} from "@/lib/sprite-variants";
import { checkSpriteExists } from "@/lib/sprites";
import type { SpriteVariantsResponse } from "@/types/sprites";

export const revalidate = 86_400;
const SPRITE_ID_REGEX = /^\d+(\.\d+)?$/;

/**
 * Handle CORS preflight requests
 */
export function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });

  // Set CORS headers
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  return response;
}

export function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    // Ignore cache busting version parameter (v)
    const maxVariants = 50;

    // Validate input
    if (!id) {
      const errorResponse = NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 },
      );
      errorResponse.headers.set("Access-Control-Allow-Origin", "*");
      return errorResponse;
    }

    // Validate id format (should be like "25.125" or just "25")
    if (!SPRITE_ID_REGEX.test(id)) {
      const errorResponse = NextResponse.json(
        {
          error:
            'Invalid id format. Expected format: "headId" or "headId.bodyId"',
        },
        { status: 400 },
      );
      errorResponse.headers.set("Access-Control-Allow-Origin", "*");
      return errorResponse;
    }

    // Wrap promise to handle rejections with proper error response and CORS headers
    return processSpriteVariants(id, maxVariants).catch((error) => {
      console.error("Error processing sprite variants:", error);

      const errorResponse = NextResponse.json(
        { error: "Failed to process sprite variants" },
        { status: 500 },
      );

      // Set CORS headers on error response
      errorResponse.headers.set("Access-Control-Allow-Origin", "*");
      errorResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
      errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");

      return errorResponse;
    });
  } catch (error) {
    console.error("Error in sprite variants API:", error);

    const errorResponse = NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );

    // Set CORS headers on error response too
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");
    errorResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return errorResponse;
  }
}

/**
 * Process sprite variants with CDN optimization
 */
async function processSpriteVariants(
  id: string,
  maxVariants: number,
): Promise<NextResponse> {
  const variants: string[] = [];

  await collectSpriteVariants(id, maxVariants, variants);

  const responseData: SpriteVariantsResponse = {
    cacheKey: id,
    timestamp: Date.now(),
    variants,
  };

  const response = NextResponse.json(responseData);

  // Set CORS headers to allow requests from any origin
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");

  // CDN-optimized cache headers
  response.headers.set(
    "Cache-Control",
    "public, max-age=86400, s-maxage=86400, stale-while-revalidate=3600", // CDN edge caching
  );

  // Additional CDN optimization headers
  response.headers.set("Vary", "Accept-Encoding"); // Enable compression

  return response;
}

async function collectSpriteVariants(
  id: string,
  maxVariants: number,
  variants: string[],
  index = 0,
): Promise<void> {
  if (index >= maxVariants) {
    return;
  }

  const variant = getSpriteVariantSuffix(index);
  const url = generateSpriteVariantUrl(id, variant);

  if (await checkSpriteExists(url, { Range: "bytes=0-1023" })) {
    variants.push(variant);
    await collectSpriteVariants(id, maxVariants, variants, index + 1);
  }
}

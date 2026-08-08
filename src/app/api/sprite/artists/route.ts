import { type NextRequest, NextResponse } from "next/server";

// Cache for 2 weeks (artists update monthly, so 2 weeks is safe)
const CACHE_DURATION = 60 * 60 * 24 * 14; // 14 days in seconds
const ARTIST_LINK_REGEX = /<a[^>]*>([^<]+)<\/a>/g;
const ARTIST_NAME_REGEX = /<a[^>]*>([^<]+)<\/a>/;
const ARTISTS_SPAN_REGEX = /<span class="artists">([\s\S]*?)<\/span>/;
const BASE_DEX_ENTRY_REGEX =
  /<article class="dex-entry sprite-variant-main">[\s\S]*?<figcaption>[\s\S]*?<\/figcaption>/;
const FIGCAPTION_REGEX = /<figcaption>[\s\S]*?<\/figcaption>/;
const SPRITE_ARTICLE_REGEX =
  /<article class="sprite-preview[^"]*">[\s\S]*?<\/article>/g;
const SPRITE_ID_REGEX = /href="\/sprite\/pif\/([^"/]+)/;

const extractArtists = (html: string): string[] => {
  const artistsMatch = html.match(ARTISTS_SPAN_REGEX);
  if (!artistsMatch) {
    return [];
  }

  const artistLinks = artistsMatch[1].match(ARTIST_LINK_REGEX);
  if (!artistLinks) {
    return [];
  }

  const artists: string[] = [];
  for (const link of artistLinks) {
    const name = link.match(ARTIST_NAME_REGEX)?.[1] || "";
    if (name.trim()) {
      artists.push(name);
    }
  }

  return artists;
};

const extractArtistCredits = (html: string, id: string) => {
  const artistCredits: Record<string, string[]> = {};
  const baseDexEntryMatch = html.match(BASE_DEX_ENTRY_REGEX);
  if (baseDexEntryMatch) {
    const baseArtists = extractArtists(baseDexEntryMatch[0]);
    if (baseArtists.length > 0) {
      artistCredits[id] = baseArtists;
    }
  }

  const spriteArticles = html.match(SPRITE_ARTICLE_REGEX);
  for (const article of spriteArticles ?? []) {
    const spriteId = article.match(SPRITE_ID_REGEX)?.[1];
    const figcaption = article.match(FIGCAPTION_REGEX)?.[0];
    if (!(spriteId && figcaption)) {
      continue;
    }

    const artists = extractArtists(figcaption);
    if (artists.length > 0) {
      artistCredits[spriteId] = artists;
    }
  }

  return artistCredits;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "ID parameter is required" },
      { status: 400 },
    );
  }

  const url = `https://www.fusiondex.org/sprite/pif/${id}/`;

  try {
    // Fetch only the first part of the page (where gallery content is)
    const response = await fetch(url, {
      headers: {
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate",
        "Accept-Language": "en-US,en;q=0.5",
        Range: "bytes=0-1048576", // First 1MB to handle Pokémon with up to 50 variants
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: {
        revalidate: CACHE_DURATION,
        tags: [`sprite-artist-${id}`],
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${response.status}` },
        { status: response.status },
      );
    }

    const html = await response.text();
    const artistCredits = extractArtistCredits(html, id);

    if (Object.keys(artistCredits).length === 0) {
      return NextResponse.json(
        { error: "No artist credits found on page" },
        { status: 404 },
      );
    }

    // Return with cache headers
    return NextResponse.json(artistCredits, {
      headers: {
        "Cache-Control": `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}`,
        "CDN-Cache-Control": `public, max-age=${CACHE_DURATION}`,
        "Vercel-CDN-Cache-Control": `public, max-age=${CACHE_DURATION}`,
      },
    });
  } catch (error) {
    console.error("Error scraping artist credit:", error);
    return NextResponse.json(
      { error: "Failed to scrape artist credit" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

// Cache for 2 weeks (artists update monthly, so 2 weeks is safe)
const CACHE_DURATION = 60 * 60 * 24 * 14; // 14 days in seconds

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'ID parameter is required' },
      { status: 400 }
    );
  }

  // Construct the FusionDex URL from the ID
  const url = `https://www.fusiondex.org/sprite/pif/${id}/`;

  // Helper function to extract artists from HTML
  const extractArtists = (html: string): string[] => {
    const artistsMatch = html.match(/<span class="artists">([\s\S]*?)<\/span>/);
    if (!artistsMatch) return [];

    const artistLinks = artistsMatch[1].match(/<a[^>]*>([^<]+)<\/a>/g);
    if (!artistLinks) return [];

    return artistLinks
      .map(link => link.match(/<a[^>]*>([^<]+)<\/a>/)?.[1] || '')
      .filter(name => name.trim());
  };

  try {
    // Fetch only the first part of the page (where gallery content is)
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Range: 'bytes=0-1048576', // First 1MB to handle Pokémon with up to 50 variants
      },
      next: {
        revalidate: CACHE_DURATION,
        tags: [`sprite-artist-${id}`],
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch page: ${response.status}` },
        { status: response.status }
      );
    }

    const html = await response.text();
    const artistCredits: Record<string, string[]> = {};

    // Extract base sprite credit
    const baseDexEntryMatch = html.match(
      /<article class="dex-entry sprite-variant-main">[\s\S]*?<figcaption>[\s\S]*?<\/figcaption>/
    );
    if (baseDexEntryMatch) {
      const baseArtists = extractArtists(baseDexEntryMatch[0]);
      if (baseArtists.length > 0) {
        artistCredits[id] = baseArtists;
      }
    }

    // Extract all gallery sprite variants
    const spriteArticles = html.match(
      /<article class="sprite-preview[^"]*">[\s\S]*?<\/article>/g
    );
    if (spriteArticles) {
      for (const article of spriteArticles) {
        const spriteIdMatch = article.match(/href="\/sprite\/pif\/([^"\/]+)/);
        const figcaptionMatch = article.match(
          /<figcaption>[\s\S]*?<\/figcaption>/
        );

        if (spriteIdMatch && figcaptionMatch) {
          const spriteId = spriteIdMatch[1];
          const artists = extractArtists(figcaptionMatch[0]);

          if (artists.length > 0) {
            artistCredits[spriteId] = artists;
          }
        }
      }
    }

    if (Object.keys(artistCredits).length === 0) {
      return NextResponse.json(
        { error: 'No artist credits found on page' },
        { status: 404 }
      );
    }

    // Return with cache headers
    return NextResponse.json(artistCredits, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_DURATION}, s-maxage=${CACHE_DURATION}`,
        'CDN-Cache-Control': `public, max-age=${CACHE_DURATION}`,
        'Vercel-CDN-Cache-Control': `public, max-age=${CACHE_DURATION}`,
      },
    });
  } catch (error) {
    console.error('Error scraping artist credit:', error);
    return NextResponse.json(
      { error: 'Failed to scrape artist credit' },
      { status: 500 }
    );
  }
}

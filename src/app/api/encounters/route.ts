import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RouteEncountersArraySchema } from '@/loaders/encounters';

// Query parameter schema
const QuerySchema = z.object({
  gameMode: z.enum(['classic', 'remix']).optional().default('classic'),
});

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const query = QuerySchema.parse({
      gameMode: searchParams.get('gameMode'),
    });

    // Load encounters data based on game mode
    let encountersData;
    if (query.gameMode === 'remix') {
      encountersData = await import('@data/remix/encounters.json');
    } else {
      encountersData = await import('@data/classic/encounters.json');
    }

    // Validate the data
    const encounters = RouteEncountersArraySchema.parse(encountersData.default);

    // Return all encounters for the game mode
    return NextResponse.json(encounters, {
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error loading encounters:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid encounters data format', details: error.issues },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to load encounters data' },
      { status: 500 }
    );
  }
}

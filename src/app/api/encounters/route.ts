import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processGameModeData } from './encounters-processor';

// Enable ISR caching - revalidate every hour
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const rawGameMode = searchParams.get('gameMode') || 'classic';

    // Validate the game mode explicitly
    const gameMode = rawGameMode === 'remix' ? 'remix' : 'classic';

    // Get pre-processed data (cached in memory)
    const processedData = processGameModeData(gameMode);

    // Return the processed data
    const isDevelopment = process.env.NODE_ENV === 'development';

    return NextResponse.json(processedData, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': isDevelopment
          ? 'public, max-age=30' // 30 seconds in dev for quick iteration
          : 'public, max-age=3600', // 1 hour in production
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

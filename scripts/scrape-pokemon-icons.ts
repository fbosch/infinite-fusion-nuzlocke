#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConsoleFormatter } from './utils/console-utils';
import { normalizePokemonNameForSprite, stripPokemonFormSuffix } from './utils/pokemon-name-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_ENTRIES_PATH = path.join(__dirname, '..', 'data', 'shared', 'base-entries.json');
const SPRITES_DIR = path.join(__dirname, 'sprites', 'pokemon-icons');
const ICON_BASE_URL = 'https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular';

export type PokemonEntry = {
  id: number;
  name: string;
};

export type PokemonIcon = {
  id: number;
  name: string;
  url: string;
  filename: string;
};

/**
 * Check if a file already exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a single image with retry logic and fallback to base name
 */
async function downloadImage(icon: PokemonIcon, retries = 3): Promise<boolean> {
  const filePath = path.join(SPRITES_DIR, icon.filename);
  
  // Check if file already exists
  if (await fileExists(filePath)) {
    return true; // Skip download, file already exists
  }

  // Try the full form name first
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(icon.url, {
        headers: {
          'User-Agent': 'Infinite-Fusion-Scraper/1.0'
        }
      });

      if (!response.ok) {
        // If it's a 404 and this is the first attempt, try fallback to base name
        if (response.status === 404 && attempt === 1) {
          const baseName = stripPokemonFormSuffix(icon.name);
          if (baseName && baseName !== icon.name) {
            const baseUrlName = normalizePokemonNameForSprite(baseName);
            const baseFilename = `${baseUrlName}.png`;
            const baseUrl = `${ICON_BASE_URL}/${baseFilename}`;
            const baseFilePath = path.join(SPRITES_DIR, baseFilename);
            
            // Try to download the base form
            try {
              const baseResponse = await fetch(baseUrl, {
                headers: {
                  'User-Agent': 'Infinite-Fusion-Scraper/1.0'
                }
              });
              
              if (baseResponse.ok) {
                const baseBuffer = await baseResponse.arrayBuffer();
                await fs.writeFile(baseFilePath, Buffer.from(baseBuffer));
                return true;
              }
            } catch {
              // Continue to retry with original name
            }
          }
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(buffer));
      return true;

    } catch (error) {
      if (attempt === retries) {
        ConsoleFormatter.error(
          `Failed to download ${icon.name} after ${retries} attempts: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`
        );
        return false;
      }
      
      // Wait before retry with exponential backoff (shorter delays)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 200));
    }
  }
  return false;
}

/**
 * Load Pokemon data and construct icon URLs
 */
async function loadPokemonIcons(): Promise<PokemonIcon[]> {
  ConsoleFormatter.printSection('Loading Pokemon Data');
  
  try {
    // Load Pokemon entries from JSON file
    const entriesData = await ConsoleFormatter.withSpinner(
      'Loading Pokemon entries...',
      async () => {
        const data = await fs.readFile(BASE_ENTRIES_PATH, 'utf-8');
        return JSON.parse(data) as PokemonEntry[];
      }
    );

    ConsoleFormatter.success(`Loaded ${entriesData.length} Pokemon entries`);

    // Transform entries to icon URLs
    ConsoleFormatter.working('Constructing icon URLs...');
    
    const icons: PokemonIcon[] = entriesData.map(entry => {
      // Use shared utility for Pokemon name normalization
      const urlName = normalizePokemonNameForSprite(entry.name);
      
      const filename = `${urlName}.png`;
      const url = `${ICON_BASE_URL}/${filename}`;
      
      return {
        id: entry.id,
        name: entry.name,
        url: url,
        filename: filename
      };
    });

    ConsoleFormatter.success(`Generated ${icons.length} icon URLs`);
    return icons;

  } catch (error) {
    ConsoleFormatter.error(
      `Error loading Pokemon data: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

/**
 * Download all Pokemon icons with progress tracking
 */
async function downloadAllIcons(icons: PokemonIcon[]): Promise<{ downloaded: number; skipped: number; errors: number }> {
  ConsoleFormatter.printSection('Downloading Pokemon Icons');

  // Ensure sprites directory exists
  await fs.mkdir(SPRITES_DIR, { recursive: true });
  ConsoleFormatter.info(`Created sprites directory: ${SPRITES_DIR}`);

  // Download icons with controlled concurrency for speed
  const batchSize = 20; // Number of simultaneous downloads
  const progressBar = ConsoleFormatter.createProgressBar(icons.length);
  
  let downloadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Process downloads in batches with full concurrency within each batch
  for (let i = 0; i < icons.length; i += batchSize) {
    const batch = icons.slice(i, i + batchSize);
    
    // Process batch with full concurrency
    const results = await Promise.all(
      batch.map(async (icon) => {
        const filePath = path.join(SPRITES_DIR, icon.filename);
        const existed = await fileExists(filePath);
        const success = await downloadImage(icon);
        return { icon, success, wasSkipped: existed };
      })
    );

    // Update counters
    results.forEach(({ success, wasSkipped }) => {
      if (success) {
        if (wasSkipped) {
          skippedCount++;
        } else {
          downloadedCount++;
        }
      } else {
        errorCount++;
      }
    });

    // Update progress
    progressBar.update(Math.min(i + batchSize, icons.length), {
      status: `New: ${downloadedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
    });

    // Very small delay between batches to be respectful to the server
    if (i + batchSize < icons.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  progressBar.stop();

  if (errorCount > 0) {
    ConsoleFormatter.warn(`Download completed with ${errorCount} errors`);
  } else {
    ConsoleFormatter.success('All icons downloaded successfully!');
  }

  return {
    downloaded: downloadedCount,
    skipped: skippedCount,
    errors: errorCount
  };
}

/**
 * Main scraping function
 */
async function scrapePokemonIcons(): Promise<void> {
  ConsoleFormatter.printHeader(
    'Pokemon Icons Downloader',
    'Downloading Pokemon sprite icons from PokéSprite repository'
  );
  
  const startTime = Date.now();

  try {
    // Load Pokemon data and construct icon URLs
    const icons = await loadPokemonIcons();
    
    if (icons.length === 0) {
      ConsoleFormatter.warn('No Pokemon data found');
      return;
    }

    // Download all icons
    const stats = await downloadAllIcons(icons);

    // Calculate stats
    const duration = Date.now() - startTime;
    const dirStats = await fs.readdir(SPRITES_DIR);
    const totalFilesCount = dirStats.filter(file => file.endsWith('.png')).length;

    // Success summary
    ConsoleFormatter.printSummary('Pokemon Icons Download Complete!', [
      { label: 'Total Pokemon', value: icons.length, color: 'blue' },
      { label: 'New downloads', value: stats.downloaded, color: 'green' },
      { label: 'Already existed', value: stats.skipped, color: 'yellow' },
      { label: 'Failed downloads', value: stats.errors, color: 'red' },
      { label: 'Total files in directory', value: totalFilesCount, color: 'green' },
      { label: 'Sprites directory', value: SPRITES_DIR, color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

  } catch (error) {
    ConsoleFormatter.error(
      `Error downloading Pokemon icons: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    process.exit(1);
  }
}

// Run the scraper directly (jiti doesn't set require.main properly)
scrapePokemonIcons();
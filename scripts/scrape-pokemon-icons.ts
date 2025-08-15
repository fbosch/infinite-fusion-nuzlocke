#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ConsoleFormatter } from './utils/console-utils';
import { normalizePokemonNameForSprite, stripPokemonFormSuffix } from './utils/pokemon-name-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_ENTRIES_PATH = path.join(__dirname, '..', 'data', 'shared', 'base-entries.json');
const SPRITES_BASE_DIR = path.join(__dirname, 'sprites');
const GEN7_SPRITES_DIR = path.join(SPRITES_BASE_DIR, 'pokemon-gen7');
const GEN8_SPRITES_DIR = path.join(SPRITES_BASE_DIR, 'pokemon-gen8');
const GEN7_ICON_BASE_URL = 'https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/regular';
const GEN8_ICON_BASE_URL = 'https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular';
const EGG_SPRITE_URL = 'https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/egg.png';

export type PokemonEntry = {
  id: number;
  name: string;
};

export type PokemonIcon = {
  id: number;
  name: string;
  url: string;
  filename: string;
  generation: 'gen7' | 'gen8';
};

export type GenerationConfig = {
  name: 'gen7' | 'gen8';
  baseUrl: string;
  spritesDir: string;
  eggSpriteUrl: string;
};

const GENERATIONS: GenerationConfig[] = [
  {
    name: 'gen7',
    baseUrl: GEN7_ICON_BASE_URL,
    spritesDir: GEN7_SPRITES_DIR,
    eggSpriteUrl: 'https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/egg.png'
  },
  {
    name: 'gen8',
    baseUrl: GEN8_ICON_BASE_URL,
    spritesDir: GEN8_SPRITES_DIR,
    eggSpriteUrl: EGG_SPRITE_URL
  }
];

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
async function downloadImage(icon: PokemonIcon, config: GenerationConfig, retries = 3): Promise<boolean> {
  const filePath = path.join(config.spritesDir, icon.filename);

  // Check if file already exists
  if (await fileExists(filePath)) {
    return true; // Skip download, file already exists
  }

  // Special handling for egg sprite (ID -1)
  if (icon.id === -1) {
    try {
      const response = await fetch(config.eggSpriteUrl, {
        headers: {
          'User-Agent': 'Infinite-Fusion-Scraper/1.0'
        }
      });

      if (!response.ok) {
        ConsoleFormatter.error(`Failed to download ${config.name} egg sprite: HTTP ${response.status}`);
        return false;
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(filePath, Buffer.from(buffer));
      return true;

    } catch (error) {
      ConsoleFormatter.error(
        `Failed to download ${config.name} egg sprite: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return false;
    }
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
            const baseUrl = `${config.baseUrl}/${baseFilename}`;
            const baseFilePath = path.join(config.spritesDir, baseFilename);

            // Try to download the base form
            try {
              const baseResponse = await fetch(baseUrl, {
                headers: {
                  'User-Agent': 'Infinite-Fusion-Scraper/1.0'
                }
              });

              if (baseResponse.ok) {
                const baseBuffer = await baseResponse.arrayBuffer();
                await fs.writeFile(baseFilePath, Buffer.from(buffer));
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
          `Failed to download ${icon.name} (${config.name}) after ${retries} attempts: ${error instanceof Error ? error.message : 'Unknown error'
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
 * Load Pokemon data and construct icon URLs for both generations
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

    // Transform entries to icon URLs for both generations
    ConsoleFormatter.working('Constructing icon URLs for both generations...');

    const icons: PokemonIcon[] = [];

    // Generate icons for each generation
    for (const config of GENERATIONS) {
      const generationIcons = entriesData.map(entry => {
        const urlName = normalizePokemonNameForSprite(entry.name);
        const filename = `${urlName}.png`;
        const url = `${config.baseUrl}/${filename}`;

        return {
          id: entry.id,
          name: entry.name,
          url: url,
          filename: filename,
          generation: config.name
        };
      });

      // Add the special egg entry for this generation
      generationIcons.unshift({
        id: -1,
        name: 'Egg',
        url: config.eggSpriteUrl,
        filename: 'egg.png',
        generation: config.name
      });

      icons.push(...generationIcons);
    }

    ConsoleFormatter.success(`Generated ${icons.length} icon URLs (${GENERATIONS.length} generations × ${entriesData.length + 1} entries each)`);
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
  ConsoleFormatter.printSection('Downloading Pokemon Icons for Both Generations');

  // Group icons by generation for better progress tracking
  const gen7Icons = icons.filter(icon => icon.generation === 'gen7');
  const gen8Icons = icons.filter(icon => icon.generation === 'gen8');

  ConsoleFormatter.info(`Gen 7 icons: ${gen7Icons.length}, Gen 8 icons: ${gen8Icons.length}`);

  let downloadedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  const batchSize = 10; // Smaller batch size to be more respectful to the server
  const progressBar = ConsoleFormatter.createProgressBar(icons.length);

  // Download Gen 7 icons first
  ConsoleFormatter.working('Downloading Gen 7 sprites...');
  for (let i = 0; i < gen7Icons.length; i += batchSize) {
    const batch = gen7Icons.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (icon) => {
        const config = GENERATIONS.find(g => g.name === icon.generation)!;
        const filePath = path.join(config.spritesDir, icon.filename);
        const existed = await fileExists(filePath);
        const success = await downloadImage(icon, config);
        return { icon, success, wasSkipped: existed };
      })
    );

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

    progressBar.update(Math.min(i + batchSize, gen7Icons.length), {
      status: `Gen 7: New: ${downloadedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
    });

    if (i + batchSize < gen7Icons.length) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  // Download Gen 8 icons
  ConsoleFormatter.working('Downloading Gen 8 sprites...');
  for (let i = 0; i < gen8Icons.length; i += batchSize) {
    const batch = gen8Icons.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (icon) => {
        const config = GENERATIONS.find(g => g.name === icon.generation)!;
        const filePath = path.join(config.spritesDir, icon.filename);
        const existed = await fileExists(filePath);
        const success = await downloadImage(icon, config);
        return { icon, success, wasSkipped: existed };
      })
    );

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

    progressBar.update(gen7Icons.length + Math.min(i + batchSize, gen8Icons.length), {
      status: `Gen 8: New: ${downloadedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`
    });

    if (i + batchSize < gen8Icons.length) {
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
    'Pokemon Icons Downloader (Gen 7 + Gen 8)',
    'Downloading Pokemon sprite icons from PokéSprite repository for both generations'
  );

  const startTime = Date.now();

  try {
    // Ensure output directories exist
    await fs.mkdir(SPRITES_BASE_DIR, { recursive: true });
    for (const config of GENERATIONS) {
      await fs.mkdir(config.spritesDir, { recursive: true });
    }

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
    const gen7Stats = await fs.readdir(GEN7_SPRITES_DIR);
    const gen8Stats = await fs.readdir(GEN8_SPRITES_DIR);
    const gen7FileCount = gen7Stats.filter(file => file.endsWith('.png')).length;
    const gen8FileCount = gen8Stats.filter(file => file.endsWith('.png')).length;

    // Success summary
    ConsoleFormatter.printSummary('Pokemon Icons Download Complete!', [
      { label: 'Total Pokemon', value: icons.length / GENERATIONS.length, color: 'blue' },
      { label: 'Generations', value: GENERATIONS.length, color: 'cyan' },
      { label: 'New downloads', value: stats.downloaded, color: 'green' },
      { label: 'Already existed', value: stats.skipped, color: 'yellow' },
      { label: 'Failed downloads', value: stats.errors, color: 'red' },
      { label: 'Gen 7 files', value: gen7FileCount, color: 'green' },
      { label: 'Gen 8 files', value: gen8FileCount, color: 'green' },
      { label: 'Gen 7 directory', value: GEN7_SPRITES_DIR, color: 'cyan' },
      { label: 'Gen 8 directory', value: GEN8_SPRITES_DIR, color: 'cyan' },
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
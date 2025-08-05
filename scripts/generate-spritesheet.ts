#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { ConsoleFormatter } from './utils/console-utils';
import { normalizePokemonNameForSprite, stripPokemonFormSuffix } from './utils/pokemon-name-utils';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_ENTRIES_PATH = path.join(__dirname, '..', 'data', 'shared', 'base-entries.json');
const SPRITES_DIR = path.join(__dirname, 'sprites', 'pokemon-icons');
const SPRITESHEET_OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images');
const METADATA_OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets');

export type PokemonEntry = {
  id: number;
  name: string;
};

export type SpriteInfo = {
  id: number;
  name: string;
  filename: string;
  exists: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpritesheetMetadata = {
  spriteWidth: number;
  spriteHeight: number;
  columns: number;
  rows: number;
  totalSprites: number;
  sheetWidth: number;
  sheetHeight: number;
  sprites: SpriteInfo[];
};

/**
 * Check if a file exists
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
 * Find the sprite file for a Pokemon, with fallback logic
 */
async function findSpriteFile(pokemonName: string): Promise<string | null> {
  // Try the full form name first
  const normalizedName = normalizePokemonNameForSprite(pokemonName);
  const primaryFilename = `${normalizedName}.png`;
  const primaryPath = path.join(SPRITES_DIR, primaryFilename);
  
  if (await fileExists(primaryPath)) {
    return primaryFilename;
  }

  // Try fallback to base name
  const baseName = stripPokemonFormSuffix(pokemonName);
  if (baseName && baseName !== pokemonName) {
    const baseNormalizedName = normalizePokemonNameForSprite(baseName);
    const baseFilename = `${baseNormalizedName}.png`;
    const basePath = path.join(SPRITES_DIR, baseFilename);
    
    if (await fileExists(basePath)) {
      return baseFilename;
    }
  }

  return null;
}

/**
 * Load Pokemon data and determine sprite files
 */
async function loadSpriteData(): Promise<SpriteInfo[]> {
  ConsoleFormatter.printSection('Loading Pokemon Data');
  
  // Load Pokemon entries
  const entriesData = await ConsoleFormatter.withSpinner(
    'Loading Pokemon entries...',
    async () => {
      const data = await fs.readFile(BASE_ENTRIES_PATH, 'utf-8');
      return JSON.parse(data) as PokemonEntry[];
    }
  );

  ConsoleFormatter.success(`Loaded ${entriesData.length} Pokemon entries`);

  // Find sprite files for each Pokemon
  ConsoleFormatter.working('Finding sprite files...');
  const progressBar = ConsoleFormatter.createProgressBar(entriesData.length);
  
  const spriteInfos: SpriteInfo[] = [];
  let foundCount = 0;
  let missingCount = 0;

  for (let i = 0; i < entriesData.length; i++) {
    const entry = entriesData[i];
    const filename = await findSpriteFile(entry.name);
    
    if (filename) {
      foundCount++;
      spriteInfos.push({
        id: entry.id,
        name: entry.name,
        filename: filename,
        exists: true,
        x: 0, // Will be calculated later
        y: 0, // Will be calculated later
        width: 0, // Will be determined from actual sprite
        height: 0, // Will be determined from actual sprite
      });
    } else {
      missingCount++;
      ConsoleFormatter.warn(`Missing sprite for: ${entry.name}`);
      // Still add to maintain order, but mark as non-existent
      spriteInfos.push({
        id: entry.id,
        name: entry.name,
        filename: '',
        exists: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    }

    progressBar.update(i + 1, { status: `Found: ${foundCount}, Missing: ${missingCount}` });
  }

  progressBar.stop();
  ConsoleFormatter.success(`Found ${foundCount} sprites, ${missingCount} missing`);
  
  return spriteInfos;
}

/**
 * Calculate optimal grid layout for spritesheet
 */
function calculateGridLayout(totalSprites: number): { columns: number; rows: number } {
  // Aim for roughly square aspect ratio
  const sqrt = Math.sqrt(totalSprites);
  const columns = Math.ceil(sqrt);
  const rows = Math.ceil(totalSprites / columns);
  
  return { columns, rows };
}

/**
 * Generate the spritesheet image and metadata
 */
async function generateSpritesheet(spriteInfos: SpriteInfo[]): Promise<SpritesheetMetadata> {
  ConsoleFormatter.printSection('Generating Spritesheet');

  // Filter out missing sprites for the actual sheet generation
  const existingSprites = spriteInfos.filter(sprite => sprite.exists);
  
  if (existingSprites.length === 0) {
    throw new Error('No sprites found to generate spritesheet');
  }

  ConsoleFormatter.info(`Generating spritesheet with ${existingSprites.length} sprites`);

  // Determine sprite dimensions by loading the first sprite
  const firstSpritePath = path.join(SPRITES_DIR, existingSprites[0].filename);
  const firstSpriteMetadata = await sharp(firstSpritePath).metadata();
  const spriteWidth = firstSpriteMetadata.width!;
  const spriteHeight = firstSpriteMetadata.height!;

  ConsoleFormatter.info(`Sprite dimensions: ${spriteWidth}x${spriteHeight}px`);

  // Calculate grid layout
  const { columns, rows } = calculateGridLayout(existingSprites.length);
  const sheetWidth = columns * spriteWidth;
  const sheetHeight = rows * spriteHeight;

  ConsoleFormatter.info(`Grid layout: ${columns}x${rows} (${sheetWidth}x${sheetHeight}px)`);

  // Create base image
  const baseImage = sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Prepare composite operations
  const compositeOps: any[] = [];
  let spriteIndex = 0;

  const progressBar = ConsoleFormatter.createProgressBar(existingSprites.length);

  for (const spriteInfo of existingSprites) {
    const col = spriteIndex % columns;
    const row = Math.floor(spriteIndex / columns);
    const x = col * spriteWidth;
    const y = row * spriteHeight;

    // Update sprite info with position
    spriteInfo.x = x;
    spriteInfo.y = y;
    spriteInfo.width = spriteWidth;
    spriteInfo.height = spriteHeight;

    // Add to composite operations
    const spritePath = path.join(SPRITES_DIR, spriteInfo.filename);
    compositeOps.push({
      input: spritePath,
      left: x,
      top: y
    });

    spriteIndex++;
    progressBar.update(spriteIndex, { status: `Processing ${spriteInfo.name}` });
  }

  progressBar.stop();

  // Generate PNG spritesheet with standard compression
  ConsoleFormatter.working('Compositing spritesheet...');
  
  const spritesheetPath = path.join(SPRITESHEET_OUTPUT_DIR, 'pokemon-spritesheet.png');
  await baseImage
    .composite(compositeOps)
    .png({ 
      compressionLevel: 9  // Maximum lossless PNG compression
    })
    .toFile(spritesheetPath);
  
  const outputStats = await fs.stat(spritesheetPath);

  ConsoleFormatter.success(`Spritesheet saved to: ${spritesheetPath}`);

  // Create metadata
  const metadata: SpritesheetMetadata = {
    spriteWidth,
    spriteHeight,
    columns,
    rows,
    totalSprites: existingSprites.length,
    sheetWidth,
    sheetHeight,
    sprites: spriteInfos, // Include all sprites, even missing ones for order preservation
  };

  // Save metadata
  const metadataPath = path.join(METADATA_OUTPUT_DIR, 'pokemon-spritesheet-metadata.json');
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  
  ConsoleFormatter.success(`Metadata saved to: ${metadataPath}`);

  return metadata;
}

/**
 * Main spritesheet generation function
 */
async function generatePokemonSpritesheet(): Promise<void> {
  ConsoleFormatter.printHeader(
    'Pokemon Spritesheet Generator',
    'Creating spritesheet from downloaded Pokemon sprites'
  );
  
  const startTime = Date.now();

  try {
    // Ensure output directories exist
    await fs.mkdir(SPRITESHEET_OUTPUT_DIR, { recursive: true });
    await fs.mkdir(METADATA_OUTPUT_DIR, { recursive: true });

    // Load sprite data
    const spriteInfos = await loadSpriteData();
    
    if (spriteInfos.length === 0) {
      ConsoleFormatter.warn('No Pokemon data found');
      return;
    }

    // Generate spritesheet
    const metadata = await generateSpritesheet(spriteInfos);

    // Calculate stats
    const duration = Date.now() - startTime;
    const existingSprites = spriteInfos.filter(s => s.exists);
    const outputFile = await fs.stat(path.join(SPRITESHEET_OUTPUT_DIR, 'pokemon-spritesheet.png'));

    // Success summary
    ConsoleFormatter.printSummary('Spritesheet Generation Complete!', [
      { label: 'Total Pokemon', value: spriteInfos.length, color: 'blue' },
      { label: 'Sprites included', value: existingSprites.length, color: 'green' },
      { label: 'Missing sprites', value: spriteInfos.length - existingSprites.length, color: 'yellow' },
      { label: 'Grid layout', value: `${metadata.columns}x${metadata.rows}`, color: 'cyan' },
      { label: 'Sheet dimensions', value: `${metadata.sheetWidth}x${metadata.sheetHeight}px`, color: 'cyan' },
      { label: 'File size', value: ConsoleFormatter.formatFileSize(outputFile.size), color: 'green' },
      { label: 'Spritesheet location', value: SPRITESHEET_OUTPUT_DIR, color: 'cyan' },
      { label: 'Metadata location', value: METADATA_OUTPUT_DIR, color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

  } catch (error) {
    ConsoleFormatter.error(
      `Error generating spritesheet: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    process.exit(1);
  }
}

// Run the generator
generatePokemonSpritesheet();
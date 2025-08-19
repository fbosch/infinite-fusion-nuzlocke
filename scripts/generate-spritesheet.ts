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
const SPRITES_BASE_DIR = path.join(__dirname, 'sprites');
const GEN7_SPRITES_DIR = path.join(SPRITES_BASE_DIR, 'pokemon-gen7');
const GEN8_SPRITES_DIR = path.join(SPRITES_BASE_DIR, 'pokemon-gen8');
const SPRITESHEET_OUTPUT_DIR = path.join(__dirname, '..', 'public', 'images');
const METADATA_OUTPUT_DIR = path.join(__dirname, '..', 'src', 'assets');

export type PokemonEntry = {
  id: number;
  name: string;
};

export type SpriteBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpriteInfo = {
  id: number;
  name: string;
  filename: string;
  exists: boolean;
  generation: 'gen7' | 'gen8';
  // Original sprite dimensions
  originalWidth: number;
  originalHeight: number;
  // Actual content bounds within original sprite
  contentBounds: SpriteBounds | null;
  // Position in the packed spritesheet
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SpritesheetMetadata = {
  algorithm: 'compact-bin-packing';
  version: '2.0';
  generation: 'gen7' | 'gen8';
  totalSprites: number;
  includedSprites: number;
  sheetWidth: number;
  sheetHeight: number;
  spaceEfficiency: number;
  sprites: SpriteInfo[];
};

export type GenerationConfig = {
  name: 'gen7' | 'gen8';
  spritesDir: string;
  outputFilename: string;
  metadataFilename: string;
};

const GENERATIONS: GenerationConfig[] = [
  {
    name: 'gen7',
    spritesDir: GEN7_SPRITES_DIR,
    outputFilename: 'pokemon-gen7-spritesheet.png',
    metadataFilename: 'pokemon-gen7-spritesheet-metadata.json'
  },
  {
    name: 'gen8',
    spritesDir: GEN8_SPRITES_DIR,
    outputFilename: 'pokemon-gen8-spritesheet.png',
    metadataFilename: 'pokemon-gen8-spritesheet-metadata.json'
  }
];

/**
 * Rectangle for bin packing algorithm
 */
type Rectangle = {
  x: number;
  y: number;
  width: number;
  height: number;
  used: boolean;
  right?: Rectangle;
  down?: Rectangle;
};

/**
 * Simple bin packing algorithm implementation
 * 
 * This algorithm mathematically guarantees no overlaps because:
 * 1. Each sprite is placed in a single, unused node
 * 2. When a node is split, the new rectangles are positioned exactly at the boundaries
 * 3. The down rectangle starts at y + height (no overlap with placed sprite)
 * 4. The right rectangle starts at x + width (no overlap with placed sprite)
 * 5. Each new rectangle has reduced dimensions that fit within the original node
 * 6. No gaps are added, maximizing space efficiency
 */
class BinPacker {
  private root: Rectangle;

  constructor(width: number, height: number) {
    this.root = { x: 0, y: 0, width, height, used: false };
  }

  pack(width: number, height: number): Rectangle | null {
    const node = this.findNode(this.root, width, height);
    if (node) {
      return this.splitNode(node, width, height);
    }
    return null;
  }

  private findNode(root: Rectangle, width: number, height: number): Rectangle | null {
    if (root.used) {
      return this.findNode(root.right!, width, height) || this.findNode(root.down!, width, height);
    } else if (width <= root.width && height <= root.height) {
      return root;
    }
    return null;
  }

  private splitNode(node: Rectangle, width: number, height: number): Rectangle {
    node.used = true;
    
    // Create the down rectangle (below the placed sprite)
    node.down = {
      x: node.x,
      y: node.y + height,
      width: node.width,
      height: node.height - height,
      used: false
    };
    
    // Create the right rectangle (to the right of the placed sprite)
    node.right = {
      x: node.x + width,
      y: node.y,
      width: node.width - width,
      height: height,
      used: false
    };
    
    // Return the node with the exact dimensions requested
    return {
      x: node.x,
      y: node.y,
      width,
      height,
      used: true
    };
  }

  // Add method to get all packed rectangles for debugging
  getAllPackedRectangles(): Rectangle[] {
    const rectangles: Rectangle[] = [];
    this.collectRectangles(this.root, rectangles);
    return rectangles.filter(r => r.used);
  }

  private collectRectangles(node: Rectangle, rectangles: Rectangle[]): void {
    if (node.used) {
      // Find the actual dimensions of this used node
      const actualWidth = node.right ? node.right.x - node.x : node.width;
      const actualHeight = node.down ? node.down.y - node.y : node.height;
      
      rectangles.push({
        x: node.x,
        y: node.y,
        width: actualWidth,
        height: actualHeight,
        used: true
      });
      
      if (node.right) this.collectRectangles(node.right, rectangles);
      if (node.down) this.collectRectangles(node.down, rectangles);
    }
  }
}

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
 * Analyze a sprite to find its actual content bounds
 */
async function analyzeSpriteContent(spritePath: string): Promise<SpriteBounds | null> {
  try {
    const image = sharp(spritePath);
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    let minX = info.width;
    let maxX = -1;
    let minY = info.height;
    let maxY = -1;

    // Find bounds of non-transparent pixels with precise alpha detection
    // Since there's no anti-aliasing, we can use a strict alpha > 0 threshold
    
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const pixelIndex = (y * info.width + x) * info.channels;
        const alpha = data[pixelIndex + 3];

        if (alpha > 0) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }

    if (maxX === -1) {
      return null; // Completely transparent
    }

    // Return exact content bounds without padding
    return {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  } catch {
    return null;
  }
}

/**
 * Find the sprite file for a Pokemon, with fallback logic
 */
async function findSpriteFile(pokemonName: string, spritesDir: string): Promise<string | null> {
  // Try the full form name first
  const normalizedName = normalizePokemonNameForSprite(pokemonName);
  const primaryFilename = `${normalizedName}.png`;
  const primaryPath = path.join(spritesDir, primaryFilename);

  if (await fileExists(primaryPath)) {
    return primaryFilename;
  }

  // Try fallback to base name
  const baseName = stripPokemonFormSuffix(pokemonName);
  if (baseName && baseName !== pokemonName) {
    const baseNormalizedName = normalizePokemonNameForSprite(baseName);
    const baseFilename = `${baseNormalizedName}.png`;
    const basePath = path.join(spritesDir, baseFilename);

    if (await fileExists(basePath)) {
      return baseFilename;
    }
  }

  return null;
}

/**
 * Load Pokemon data and analyze sprite content for a specific generation
 */
async function loadSpriteData(generation: GenerationConfig): Promise<SpriteInfo[]> {
  ConsoleFormatter.printSection(`Loading and Analyzing ${generation.name.toUpperCase()} Pokemon Sprites`);

  // Load Pokemon entries
  const entriesData = await ConsoleFormatter.withSpinner(
    'Loading Pokemon entries...',
    async () => {
      const data = await fs.readFile(BASE_ENTRIES_PATH, 'utf-8');
      return JSON.parse(data) as PokemonEntry[];
    }
  );

  ConsoleFormatter.success(`Loaded ${entriesData.length} Pokemon entries`);

  // Process each sprite
  ConsoleFormatter.working('Analyzing sprite content bounds...');
  const progressBar = ConsoleFormatter.createProgressBar(entriesData.length);

  const spriteInfos: SpriteInfo[] = [];
  let foundCount = 0;
  let missingCount = 0;
  let totalEfficiency = 0;

  for (let i = 0; i < entriesData.length; i++) {
    const entry = entriesData[i];
    const filename = await findSpriteFile(entry.name, generation.spritesDir);

    if (filename) {
      const spritePath = path.join(generation.spritesDir, filename);

      // Get original dimensions
      const metadata = await sharp(spritePath).metadata();
      const originalWidth = metadata.width!;
      const originalHeight = metadata.height!;

      // Analyze content bounds
      const contentBounds = await analyzeSpriteContent(spritePath);

      if (contentBounds) {
        const efficiency = (contentBounds.width * contentBounds.height) / (originalWidth * originalHeight);
        totalEfficiency += efficiency;
        foundCount++;

        spriteInfos.push({
          id: entry.id,
          name: entry.name,
          filename,
          exists: true,
          generation: generation.name,
          originalWidth,
          originalHeight,
          contentBounds,
          x: 0, // Will be set during packing
          y: 0,
          width: contentBounds.width,
          height: contentBounds.height,
        });
      } else {
        // Transparent or invalid sprite
        missingCount++;
        spriteInfos.push({
          id: entry.id,
          name: entry.name,
          filename,
          exists: false,
          generation: generation.name,
          originalWidth,
          originalHeight,
          contentBounds: null,
          x: 0,
          y: 0,
          width: 0,
          height: 0,
        });
      }
    } else {
      missingCount++;
      spriteInfos.push({
        id: entry.id,
        name: entry.name,
        filename: '',
        exists: false,
        generation: generation.name,
        originalWidth: 0,
        originalHeight: 0,
        contentBounds: null,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      });
    }

    progressBar.update(i + 1, {
      status: `Found: ${foundCount}, Missing: ${missingCount}`
    });
  }

  progressBar.stop();

  const avgEfficiency = foundCount > 0 ? (totalEfficiency / foundCount * 100) : 0;
  ConsoleFormatter.success(`Found ${foundCount} sprites, ${missingCount} missing`);
  ConsoleFormatter.info(`Average content efficiency: ${avgEfficiency.toFixed(1)}%`);

  return spriteInfos;
}

/**
 * Pack sprites using bin packing algorithm
 */
function packSprites(sprites: SpriteInfo[]): { width: number; height: number; efficiency: number } {
  ConsoleFormatter.printSection('Packing Sprites with Bin Packing Algorithm');

  const validSprites = sprites.filter(s => s.exists && s.contentBounds);

  if (validSprites.length === 0) {
    throw new Error('No valid sprites to pack');
  }

  // Sort by height descending, then by width descending (improves packing efficiency)
  validSprites.sort((a, b) => {
    const heightDiff = b.height - a.height;
    return heightDiff !== 0 ? heightDiff : b.width - a.width;
  });

  // Estimate initial canvas size with more padding to prevent overlaps
  const totalArea = validSprites.reduce((sum, s) => sum + (s.width * s.height), 0);
  const avgAspectRatio = validSprites.reduce((sum, s) => sum + (s.width / s.height), 0) / validSprites.length;

  let canvasWidth = Math.ceil(Math.sqrt(totalArea * avgAspectRatio)) + 200; // Increased padding
  let canvasHeight = Math.ceil(totalArea / canvasWidth) + 200;

  // Try packing with progressively larger canvas sizes
  let packed = false;
  let attempts = 0;
  const maxAttempts = 15; // Increased max attempts

  while (!packed && attempts < maxAttempts) {
    const packer = new BinPacker(canvasWidth, canvasHeight);
    let allFit = true;

    // Reset positions
    validSprites.forEach(sprite => {
      sprite.x = 0;
      sprite.y = 0;
    });

    // Try to pack all sprites
    for (const sprite of validSprites) {
      const rect = packer.pack(sprite.width, sprite.height);
      if (rect) {
        sprite.x = rect.x;
        sprite.y = rect.y;
      } else {
        allFit = false;
        break;
      }
    }

    if (allFit) {
      packed = true;

      // Trim canvas to actual used area
      const maxX = Math.max(...validSprites.map(s => s.x + s.width));
      const maxY = Math.max(...validSprites.map(s => s.y + s.height));

      canvasWidth = maxX;
      canvasHeight = maxY;
    } else {
      // Increase canvas size more aggressively and try again
      canvasWidth = Math.ceil(canvasWidth * 1.3);
      canvasHeight = Math.ceil(canvasHeight * 1.3);
      attempts++;
    }
  }

  if (!packed) {
    throw new Error('Failed to pack all sprites after multiple attempts');
  }

  // Validate that no sprites overlap
  const hasOverlap = validateNoOverlap(validSprites);
  if (hasOverlap) {
    ConsoleFormatter.warn('Overlap detected in sprite packing, attempting to fix...');
    
    // Try to fix overlaps by adding padding
    const fixed = fixOverlaps(validSprites);
    if (fixed) {
      // Recalculate canvas dimensions after fixing
      const maxX = Math.max(...validSprites.map(s => s.x + s.width));
      const maxY = Math.max(...validSprites.map(s => s.y + s.height));
      canvasWidth = maxX;
      canvasHeight = maxY;
      
      ConsoleFormatter.success('Successfully fixed sprite overlaps');
    } else {
      throw new Error('Failed to fix sprite overlaps');
    }
  } else {
    ConsoleFormatter.success('No sprite overlaps detected');
  }

  // Final validation
  const finalOverlapCheck = validateNoOverlap(validSprites);
  if (finalOverlapCheck) {
    ConsoleFormatter.error('Final overlap check failed - sprites still overlap');
    
    // Log problematic sprites for debugging
    for (let i = 0; i < validSprites.length; i++) {
      for (let j = i + 1; j < validSprites.length; j++) {
        const a = validSprites[i]!;
        const b = validSprites[j]!;
        
        if (a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y) {
          ConsoleFormatter.error(`Overlap: ${a.name} (${a.x},${a.y},${a.width}x${a.height}) with ${b.name} (${b.x},${b.y},${b.width}x${b.height})`);
        }
      }
    }
    
    throw new Error('Sprite overlaps could not be resolved');
  }

  const usedArea = validSprites.reduce((sum, s) => sum + (s.width * s.height), 0);
  const efficiency = (usedArea / (canvasWidth * canvasHeight)) * 100;

  ConsoleFormatter.success(`Packed ${validSprites.length} sprites into ${canvasWidth}x${canvasHeight} canvas`);
  ConsoleFormatter.info(`Packing efficiency: ${efficiency.toFixed(1)}%`);

  return { width: canvasWidth, height: canvasHeight, efficiency };
}

/**
 * Check if any sprites overlap
 */
function validateNoOverlap(sprites: SpriteInfo[]): boolean {
  for (let i = 0; i < sprites.length; i++) {
    for (let j = i + 1; j < sprites.length; j++) {
      const a = sprites[i]!;
      const b = sprites[j]!;
      
      // Check for any overlap using precise mathematical bounds
      // Two rectangles overlap if and only if:
      // a.x < b.x + b.width AND a.x + a.width > b.x AND
      // a.y < b.y + b.height AND a.y + a.height > b.y
      if (a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y) {
        ConsoleFormatter.error(`Overlap detected between ${a.name} and ${b.name}`);
        ConsoleFormatter.error(`  ${a.name}: (${a.x},${a.y}) ${a.width}x${a.height}`);
        ConsoleFormatter.error(`  ${b.name}: (${b.x},${b.y}) ${b.width}x${b.height}`);
        ConsoleFormatter.error(`  Overlap area: ${Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))} x ${Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))}`);
        return true;
      }
    }
  }
  return false;
}

/**
 * Attempt to fix overlaps by adding padding
 */
function fixOverlaps(sprites: SpriteInfo[]): boolean {
  let attempts = 0;
  const maxAttempts = 10; // Increased attempts
  
  while (attempts < maxAttempts) {
    let hasOverlap = false;
    
    for (let i = 0; i < sprites.length; i++) {
      for (let j = i + 1; j < sprites.length; j++) {
        const a = sprites[i]!;
        const b = sprites[j]!;
        
        if (a.x < b.x + b.width && a.x + a.width > b.x &&
            a.y < b.y + b.height && a.y + a.height > b.y) {
          
          // Calculate overlap amounts
          const overlapX = Math.max(0, a.x + a.width - b.x);
          const overlapY = Math.max(0, a.y + a.height - b.y);
          
          // Move sprite b to avoid overlap with some extra padding
          if (overlapX > 0) {
            b.x += overlapX + 1; // Add 1px padding
          }
          if (overlapY > 0) {
            b.y += overlapY + 1; // Add 1px padding
          }
          
          hasOverlap = true;
        }
      }
    }
    
    if (!hasOverlap) {
      ConsoleFormatter.success(`Fixed overlaps in ${attempts + 1} attempts`);
      return true;
    }
    
    attempts++;
    
    // If we're taking too long, try a more aggressive approach
    if (attempts === 5) {
      ConsoleFormatter.warn('Using aggressive overlap fixing...');
      
      // Sort sprites by position and ensure minimum spacing
      sprites.sort((a, b) => {
        if (a.y !== b.y) return a.y - b.y;
        return a.x - b.x;
      });
      
      for (let i = 1; i < sprites.length; i++) {
        const prev = sprites[i - 1]!;
        const curr = sprites[i]!;
        
        // Ensure minimum spacing between sprites
        if (curr.x < prev.x + prev.width + 1) {
          curr.x = prev.x + prev.width + 1;
        }
        if (curr.y < prev.y + prev.height + 1) {
          curr.y = prev.y + prev.height + 1;
        }
      }
    }
  }
  
  ConsoleFormatter.error(`Failed to fix overlaps after ${maxAttempts} attempts`);
  return false;
}

/**
 * Generate the spritesheet image and metadata for a specific generation
 */
async function generateSpritesheet(spriteInfos: SpriteInfo[], generation: GenerationConfig): Promise<SpritesheetMetadata> {
  ConsoleFormatter.printSection(`Generating ${generation.name.toUpperCase()} Compact Spritesheet`);

  const validSprites = spriteInfos.filter(s => s.exists && s.contentBounds);

  if (validSprites.length === 0) {
    throw new Error('No sprites found to generate spritesheet');
  }

  ConsoleFormatter.info(`Generating spritesheet with ${validSprites.length} sprites`);

  // Pack sprites using bin packing algorithm
  const { width: sheetWidth, height: sheetHeight, efficiency } = packSprites(spriteInfos);

  // Create base image
  const baseImage = sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  });

  // Prepare composite operations for cropped sprites
  const compositeOps: any[] = [];
  const progressBar = ConsoleFormatter.createProgressBar(validSprites.length);

  for (let i = 0; i < validSprites.length; i++) {
    const sprite = validSprites[i];
    if (!sprite.contentBounds) continue;

    try {
      const spritePath = path.join(generation.spritesDir, sprite.filename);

      // Extract only the content area from the original sprite
      const croppedSprite = await sharp(spritePath)
        .extract({
          left: Math.max(0, sprite.contentBounds.x),
          top: Math.max(0, sprite.contentBounds.y),
          width: Math.min(sprite.contentBounds.width, sprite.originalWidth - sprite.contentBounds.x),
          height: Math.min(sprite.contentBounds.height, sprite.originalHeight - sprite.contentBounds.y)
        })
        .png()
        .toBuffer();

      compositeOps.push({
        input: croppedSprite,
        left: sprite.x,
        top: sprite.y
      });
    } catch (error) {
      ConsoleFormatter.error(`Failed to process sprite ${sprite.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Skip this sprite but continue with others
      continue;
    }

    progressBar.update(i + 1, { status: `Processing ${sprite.name}` });
  }

  progressBar.stop();

  // Generate the spritesheet
  ConsoleFormatter.working('Compositing compact spritesheet...');

  const spritesheetPath = path.join(SPRITESHEET_OUTPUT_DIR, generation.outputFilename);
  await baseImage
    .composite(compositeOps)
    .png({ compressionLevel: 9 })
    .toFile(spritesheetPath);

  ConsoleFormatter.success(`Spritesheet saved to: ${spritesheetPath}`);

  // Create metadata
  const metadata: SpritesheetMetadata = {
    algorithm: 'compact-bin-packing',
    version: '2.0',
    generation: generation.name,
    totalSprites: spriteInfos.length,
    includedSprites: validSprites.length,
    sheetWidth,
    sheetHeight,
    spaceEfficiency: efficiency,
    sprites: spriteInfos, // Include all sprites, even missing ones for order preservation
  };

  // Save metadata
  const metadataPath = path.join(METADATA_OUTPUT_DIR, generation.metadataFilename);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  ConsoleFormatter.success(`Metadata saved to: ${metadataPath}`);

  return metadata;
}

/**
 * Generate spritesheet for a single generation
 */
async function generateGenerationSpritesheet(generation: GenerationConfig): Promise<SpritesheetMetadata> {
  ConsoleFormatter.printHeader(
    `${generation.name.toUpperCase()} Compact Pokemon Spritesheet Generator`,
    `Creating space-efficient spritesheet using bin packing algorithm for ${generation.name}`
  );

  const startTime = Date.now();

  try {
    // Ensure output directories exist
    await fs.mkdir(SPRITESHEET_OUTPUT_DIR, { recursive: true });
    await fs.mkdir(METADATA_OUTPUT_DIR, { recursive: true });

    // Check if sprites directory exists
    if (!await fileExists(generation.spritesDir)) {
      throw new Error(`Sprites directory not found: ${generation.spritesDir}. Please run the scraper first.`);
    }

    // Load sprite data
    const spriteInfos = await loadSpriteData(generation);

    if (spriteInfos.length === 0) {
      ConsoleFormatter.warn('No Pokemon data found');
      throw new Error('No Pokemon data found');
    }

    // Generate spritesheet
    const metadata = await generateSpritesheet(spriteInfos, generation);

    // Calculate comparison with old grid method
    const validSprites = spriteInfos.filter(s => s.exists && s.contentBounds);
    const oldGridColumns = Math.ceil(Math.sqrt(validSprites.length));
    const oldGridRows = Math.ceil(validSprites.length / oldGridColumns);
    const oldSheetWidth = oldGridColumns * 68; // Original sprite width
    const oldSheetHeight = oldGridRows * 56; // Original sprite height
    const oldArea = oldSheetWidth * oldSheetHeight;
    const newArea = metadata.sheetWidth * metadata.sheetHeight;
    const spaceSaving = ((oldArea - newArea) / oldArea * 100);

    // Calculate stats
    const duration = Date.now() - startTime;
    const outputFile = await fs.stat(path.join(SPRITESHEET_OUTPUT_DIR, generation.outputFilename));

    // Success summary
    ConsoleFormatter.printSummary(`${generation.name.toUpperCase()} Compact Spritesheet Generation Complete!`, [
      { label: 'Generation', value: generation.name.toUpperCase(), color: 'cyan' },
      { label: 'Total Pokemon', value: spriteInfos.length, color: 'blue' },
      { label: 'Sprites included', value: metadata.includedSprites, color: 'green' },
      { label: 'Missing sprites', value: metadata.totalSprites - metadata.includedSprites, color: 'yellow' },
      { label: 'New dimensions', value: `${metadata.sheetWidth}x${metadata.sheetHeight}px`, color: 'cyan' },
      { label: 'Old dimensions', value: `${oldSheetWidth}x${oldSheetHeight}px`, color: 'red' },
      { label: 'Space efficiency', value: `${metadata.spaceEfficiency.toFixed(1)}%`, color: 'green' },
      { label: 'Space saved', value: `${spaceSaving.toFixed(1)}%`, color: 'green' },
      { label: 'File size', value: ConsoleFormatter.formatFileSize(outputFile.size), color: 'green' },
      { label: 'Algorithm', value: metadata.algorithm, color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

    return metadata;

  } catch (error) {
    ConsoleFormatter.error(
      `Error generating ${generation.name} spritesheet: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    throw error;
  }
}

/**
 * Main spritesheet generation function
 */
async function generatePokemonSpritesheets(): Promise<void> {
  ConsoleFormatter.printHeader(
    'Multi-Generation Pokemon Spritesheet Generator',
    'Creating space-efficient spritesheets for both Gen 7 and Gen 8 using bin packing algorithm'
  );

  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    // Generate spritesheets for each generation
    for (const generation of GENERATIONS) {
      try {
        await generateGenerationSpritesheet(generation);
        successCount++;
      } catch (error) {
        errorCount++;
        ConsoleFormatter.error(`Failed to generate ${generation.name} spritesheet: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Final summary
    const duration = Date.now() - startTime;
    ConsoleFormatter.printSummary('Multi-Generation Spritesheet Generation Complete!', [
      { label: 'Generations processed', value: GENERATIONS.length, color: 'blue' },
      { label: 'Successful generations', value: successCount, color: 'green' },
      { label: 'Failed generations', value: errorCount, color: 'red' },
      { label: 'Total duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

    if (errorCount > 0) {
      process.exit(1);
    }

  } catch (error) {
    ConsoleFormatter.error(
      `Error in multi-generation spritesheet generation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
    process.exit(1);
  }
}

// Run the generator
generatePokemonSpritesheets();
#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { ConsoleFormatter } from "./utils/console-utils";
import {
  normalizePokemonNameForSprite,
  stripPokemonFormSuffix,
} from "./utils/pokemon-name-utils";
import { runDirectScript } from "./utils/script-runtime-utils";
import {
  findFirstOverlappingPair,
  forEachOverlappingPair,
  getPackedBounds,
} from "./utils/sprite-packing-utils";
import {
  BasePokemonEntrySchema,
  getSpriteSourcePaths,
  loadJsonFile,
} from "./utils/sprite-source-utils";

const {
  scriptDirectory,
  baseEntriesPath: BASE_ENTRIES_PATH,
  gen7SpritesDir: GEN7_SPRITES_DIR,
  gen8SpritesDir: GEN8_SPRITES_DIR,
} = getSpriteSourcePaths(import.meta.url);
const SPRITESHEET_OUTPUT_DIR = path.join(
  scriptDirectory,
  "..",
  "public",
  "images",
);
const METADATA_OUTPUT_DIR = path.join(scriptDirectory, "..", "src", "assets");

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
  generation: "gen7" | "gen8";
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
  algorithm: "compact-bin-packing";
  version: "2.0";
  generation: "gen7" | "gen8";
  spritesheetVersion: string;
  totalSprites: number;
  includedSprites: number;
  sheetWidth: number;
  sheetHeight: number;
  spaceEfficiency: number;
  sprites: SpriteInfo[];
};

export type GenerationConfig = {
  name: "gen7" | "gen8";
  spritesDir: string;
  outputFilename: string;
  outputFormat: "png" | "webp";
  metadataFilename: string;
};

const GENERATIONS: GenerationConfig[] = [
  {
    metadataFilename: "pokemon-gen7-spritesheet-metadata.json",
    name: "gen7",
    outputFilename: "pokemon-gen7-spritesheet.webp",
    outputFormat: "webp",
    spritesDir: GEN7_SPRITES_DIR,
  },
  {
    metadataFilename: "pokemon-gen8-spritesheet-metadata.json",
    name: "gen8",
    outputFilename: "pokemon-gen8-spritesheet.webp",
    outputFormat: "webp",
    spritesDir: GEN8_SPRITES_DIR,
  },
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
    this.root = { height, used: false, width, x: 0, y: 0 };
  }

  pack(width: number, height: number): Rectangle | null {
    const node = this.findNode(this.root, width, height);
    if (node) {
      return this.splitNode(node, width, height);
    }
    return null;
  }

  private findNode(
    root: Rectangle,
    width: number,
    height: number,
  ): Rectangle | null {
    if (root.used) {
      return (
        this.findNode(root.right!, width, height) ||
        this.findNode(root.down!, width, height)
      );
    }
    if (width <= root.width && height <= root.height) {
      return root;
    }
    return null;
  }

  private splitNode(node: Rectangle, width: number, height: number): Rectangle {
    node.used = true;

    // Create the down rectangle (below the placed sprite)
    node.down = {
      height: node.height - height,
      used: false,
      width: node.width,
      x: node.x,
      y: node.y + height,
    };

    // Create the right rectangle (to the right of the placed sprite)
    node.right = {
      height,
      used: false,
      width: node.width - width,
      x: node.x + width,
      y: node.y,
    };

    // Return the node with the exact dimensions requested
    return {
      height,
      used: true,
      width,
      x: node.x,
      y: node.y,
    };
  }

  // Add method to get all packed rectangles for debugging
  getAllPackedRectangles(): Rectangle[] {
    const rectangles: Rectangle[] = [];
    this.collectRectangles(this.root, rectangles);
    return rectangles.filter((r) => r.used);
  }

  private collectRectangles(node: Rectangle, rectangles: Rectangle[]): void {
    if (node.used) {
      // Find the actual dimensions of this used node
      const actualWidth = node.right ? node.right.x - node.x : node.width;
      const actualHeight = node.down ? node.down.y - node.y : node.height;

      rectangles.push({
        height: actualHeight,
        used: true,
        width: actualWidth,
        x: node.x,
        y: node.y,
      });

      if (node.right) {
        this.collectRectangles(node.right, rectangles);
      }
      if (node.down) {
        this.collectRectangles(node.down, rectangles);
      }
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
async function analyzeSpriteContent(
  spritePath: string,
): Promise<SpriteBounds | null> {
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
      height: maxY - minY + 1,
      width: maxX - minX + 1,
      x: minX,
      y: minY,
    };
  } catch {
    return null;
  }
}

/**
 * Find the sprite file for a Pokemon, with fallback logic
 */
async function findSpriteFile(
  pokemonName: string,
  spritesDir: string,
): Promise<string | null> {
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
async function loadSpriteData(
  generation: GenerationConfig,
): Promise<SpriteInfo[]> {
  ConsoleFormatter.printSection(
    `Loading and Analyzing ${generation.name.toUpperCase()} Pokemon Sprites`,
  );

  // Load Pokemon entries
  const entriesData = await ConsoleFormatter.withSpinner(
    "Loading Pokemon entries...",
    async () => loadJsonFile(BASE_ENTRIES_PATH, BasePokemonEntrySchema.array()),
  );

  ConsoleFormatter.success(`Loaded ${entriesData.length} Pokemon entries`);

  // Process each sprite
  ConsoleFormatter.working("Analyzing sprite content bounds...");
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
        const efficiency =
          (contentBounds.width * contentBounds.height) /
          (originalWidth * originalHeight);
        totalEfficiency += efficiency;
        foundCount++;

        spriteInfos.push({
          contentBounds,
          exists: true,
          filename,
          generation: generation.name,
          height: contentBounds.height,
          id: entry.id,
          name: entry.name,
          originalHeight,
          originalWidth,
          width: contentBounds.width,
          x: 0, // Will be set during packing
          y: 0,
        });
      } else {
        // Transparent or invalid sprite
        missingCount++;
        spriteInfos.push({
          contentBounds: null,
          exists: false,
          filename,
          generation: generation.name,
          height: 0,
          id: entry.id,
          name: entry.name,
          originalHeight,
          originalWidth,
          width: 0,
          x: 0,
          y: 0,
        });
      }
    } else {
      missingCount++;
      spriteInfos.push({
        contentBounds: null,
        exists: false,
        filename: "",
        generation: generation.name,
        height: 0,
        id: entry.id,
        name: entry.name,
        originalHeight: 0,
        originalWidth: 0,
        width: 0,
        x: 0,
        y: 0,
      });
    }

    progressBar.update(i + 1, {
      status: `Found: ${foundCount}, Missing: ${missingCount}`,
    });
  }

  progressBar.stop();

  const avgEfficiency =
    foundCount > 0 ? (totalEfficiency / foundCount) * 100 : 0;
  ConsoleFormatter.success(
    `Found ${foundCount} sprites, ${missingCount} missing`,
  );
  ConsoleFormatter.info(
    `Average content efficiency: ${avgEfficiency.toFixed(1)}%`,
  );

  return spriteInfos;
}

/**
 * Pack sprites using bin packing algorithm
 */
export function packSprites(sprites: SpriteInfo[]): {
  width: number;
  height: number;
  efficiency: number;
} {
  ConsoleFormatter.printSection("Packing Sprites with Bin Packing Algorithm");

  const validSprites = sprites.filter((s) => s.exists && s.contentBounds);

  if (validSprites.length === 0) {
    throw new Error("No valid sprites to pack");
  }

  // Sort by height descending, then by width descending (improves packing efficiency)
  validSprites.sort((a, b) => {
    const heightDiff = b.height - a.height;
    return heightDiff === 0 ? b.width - a.width : heightDiff;
  });

  const packedBounds = packWithGrowingCanvas(validSprites);
  const { width: canvasWidth, height: canvasHeight } = resolvePackedOverlaps(
    validSprites,
    packedBounds,
  );

  const usedArea = validSprites.reduce((sum, s) => sum + s.width * s.height, 0);
  const efficiency = (usedArea / (canvasWidth * canvasHeight)) * 100;

  ConsoleFormatter.success(
    `Packed ${validSprites.length} sprites into ${canvasWidth}x${canvasHeight} canvas`,
  );
  ConsoleFormatter.info(`Packing efficiency: ${efficiency.toFixed(1)}%`);

  return { efficiency, height: canvasHeight, width: canvasWidth };
}

function packWithGrowingCanvas(sprites: SpriteInfo[]): {
  width: number;
  height: number;
} {
  const totalArea = sprites.reduce((sum, s) => sum + s.width * s.height, 0);
  const avgAspectRatio =
    sprites.reduce((sum, s) => sum + s.width / s.height, 0) / sprites.length;
  let width = Math.ceil(Math.sqrt(totalArea * avgAspectRatio)) + 200;
  let height = Math.ceil(totalArea / width) + 200;

  for (let attempt = 0; attempt < 15; attempt += 1) {
    if (packAllSpritesIntoCanvas(sprites, width, height)) {
      return getPackedBounds(sprites);
    }
    width = Math.ceil(width * 1.3);
    height = Math.ceil(height * 1.3);
  }

  throw new Error("Failed to pack all sprites after multiple attempts");
}

function packAllSpritesIntoCanvas(
  sprites: SpriteInfo[],
  width: number,
  height: number,
): boolean {
  const packer = new BinPacker(width, height);

  for (const sprite of sprites) {
    sprite.x = 0;
    sprite.y = 0;
  }

  for (const sprite of sprites) {
    const rect = packer.pack(sprite.width, sprite.height);
    if (!rect) {
      return false;
    }
    sprite.x = rect.x;
    sprite.y = rect.y;
  }

  return true;
}

function resolvePackedOverlaps(
  sprites: SpriteInfo[],
  bounds: { width: number; height: number },
): { width: number; height: number } {
  if (!validateNoOverlap(sprites)) {
    ConsoleFormatter.success("No sprite overlaps detected");
    return bounds;
  }

  ConsoleFormatter.warn(
    "Overlap detected in sprite packing, attempting to fix...",
  );
  if (!fixOverlaps(sprites)) {
    throw new Error("Failed to fix sprite overlaps");
  }

  ConsoleFormatter.success("Successfully fixed sprite overlaps");
  const fixedBounds = getPackedBounds(sprites);
  if (!validateNoOverlap(sprites)) {
    return fixedBounds;
  }

  ConsoleFormatter.error("Final overlap check failed - sprites still overlap");
  logOverlappingSprites(sprites);
  throw new Error("Sprite overlaps could not be resolved");
}

/**
 * Check if any sprites overlap
 */
function validateNoOverlap(sprites: SpriteInfo[]): boolean {
  const overlap = findFirstOverlappingPair(sprites);
  if (!overlap) {
    return false;
  }

  const [a, b] = overlap;
  ConsoleFormatter.error(`Overlap detected between ${a.name} and ${b.name}`);
  ConsoleFormatter.error(`  ${a.name}: (${a.x},${a.y}) ${a.width}x${a.height}`);
  ConsoleFormatter.error(`  ${b.name}: (${b.x},${b.y}) ${b.width}x${b.height}`);
  ConsoleFormatter.error(
    `  Overlap area: ${Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x))} x ${Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))}`,
  );
  return true;
}

function logOverlappingSprites(sprites: SpriteInfo[]): void {
  forEachOverlappingPair(sprites, (a, b) => {
    ConsoleFormatter.error(
      `Overlap: ${a.name} (${a.x},${a.y},${a.width}x${a.height}) with ${b.name} (${b.x},${b.y},${b.width}x${b.height})`,
    );
    return false;
  });
}

/**
 * Attempt to fix overlaps by adding padding
 */
export function fixOverlaps(sprites: SpriteInfo[]): boolean {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const hasOverlap = forEachOverlappingPair(sprites, (a, b) => {
      const overlapX = Math.max(0, a.x + a.width - b.x);
      const overlapY = Math.max(0, a.y + a.height - b.y);

      if (overlapX > 0) {
        b.x += overlapX + 1;
      }
      if (overlapY > 0) {
        b.y += overlapY + 1;
      }
      return false;
    });

    if (!hasOverlap) {
      ConsoleFormatter.success(`Fixed overlaps in ${attempt + 1} attempts`);
      return true;
    }

    if (attempt === 4) {
      ConsoleFormatter.warn("Using aggressive overlap fixing...");
      applyAggressiveOverlapSpacing(sprites);
    }
  }

  ConsoleFormatter.error(
    `Failed to fix overlaps after ${maxAttempts} attempts`,
  );
  return false;
}

function applyAggressiveOverlapSpacing(sprites: SpriteInfo[]): void {
  sprites.sort((a, b) => a.y - b.y || a.x - b.x);

  for (let index = 1; index < sprites.length; index += 1) {
    const previous = sprites[index - 1];
    const current = sprites[index];
    if (!(previous && current)) {
      continue;
    }
    current.x = Math.max(current.x, previous.x + previous.width + 1);
    current.y = Math.max(current.y, previous.y + previous.height + 1);
  }
}

/**
 * Generate the spritesheet image and metadata for a specific generation
 */
async function generateSpritesheet(
  spriteInfos: SpriteInfo[],
  generation: GenerationConfig,
): Promise<SpritesheetMetadata> {
  ConsoleFormatter.printSection(
    `Generating ${generation.name.toUpperCase()} Compact Spritesheet`,
  );

  const validSprites = spriteInfos.filter((s) => s.exists && s.contentBounds);

  if (validSprites.length === 0) {
    throw new Error("No sprites found to generate spritesheet");
  }

  ConsoleFormatter.info(
    `Generating spritesheet with ${validSprites.length} sprites`,
  );

  // Pack sprites using bin packing algorithm
  const {
    width: sheetWidth,
    height: sheetHeight,
    efficiency,
  } = packSprites(spriteInfos);

  // Create base image
  const baseImage = sharp({
    create: {
      background: { alpha: 0, b: 0, g: 0, r: 0 },
      channels: 4,
      height: sheetHeight,
      width: sheetWidth,
    },
  });

  // Prepare composite operations for cropped sprites
  const compositeOps: any[] = [];
  const progressBar = ConsoleFormatter.createProgressBar(validSprites.length);

  for (let i = 0; i < validSprites.length; i++) {
    const sprite = validSprites[i];
    if (!sprite.contentBounds) {
      continue;
    }

    try {
      const spritePath = path.join(generation.spritesDir, sprite.filename);

      // Extract only the content area from the original sprite
      const croppedSprite = await sharp(spritePath)
        .extract({
          height: Math.min(
            sprite.contentBounds.height,
            sprite.originalHeight - sprite.contentBounds.y,
          ),
          left: Math.max(0, sprite.contentBounds.x),
          top: Math.max(0, sprite.contentBounds.y),
          width: Math.min(
            sprite.contentBounds.width,
            sprite.originalWidth - sprite.contentBounds.x,
          ),
        })
        .png()
        .toBuffer();

      compositeOps.push({
        input: croppedSprite,
        left: sprite.x,
        top: sprite.y,
      });
    } catch (error) {
      ConsoleFormatter.error(
        `Failed to process sprite ${sprite.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      // Skip this sprite but continue with others
      continue;
    }

    progressBar.update(i + 1, { status: `Processing ${sprite.name}` });
  }

  progressBar.stop();

  // Generate the spritesheet
  ConsoleFormatter.working("Compositing compact spritesheet...");

  const spritesheetPath = path.join(
    SPRITESHEET_OUTPUT_DIR,
    generation.outputFilename,
  );
  const spritesheet = baseImage.composite(compositeOps);
  if (generation.outputFormat === "webp") {
    await spritesheet
      .webp({ effort: 6, lossless: true })
      .toFile(spritesheetPath);
  } else {
    await spritesheet.png({ compressionLevel: 9 }).toFile(spritesheetPath);
  }

  ConsoleFormatter.success(`Spritesheet saved to: ${spritesheetPath}`);

  // Create metadata
  const metadataWithoutVersion: Omit<
    SpritesheetMetadata,
    "spritesheetVersion"
  > = {
    algorithm: "compact-bin-packing",
    generation: generation.name,
    includedSprites: validSprites.length,
    sheetHeight,
    sheetWidth,
    spaceEfficiency: efficiency,
    sprites: spriteInfos, // Include all sprites, even missing ones for order preservation
    totalSprites: spriteInfos.length,
    version: "2.0",
  };
  const metadata: SpritesheetMetadata = {
    ...metadataWithoutVersion,
    spritesheetVersion: createHash("sha256")
      .update(await fs.readFile(spritesheetPath))
      .digest("hex")
      .slice(0, 12),
  };

  // Save metadata
  const metadataPath = path.join(
    METADATA_OUTPUT_DIR,
    generation.metadataFilename,
  );
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

  ConsoleFormatter.success(`Metadata saved to: ${metadataPath}`);

  return metadata;
}

/**
 * Generate spritesheet for a single generation
 */
async function generateGenerationSpritesheet(
  generation: GenerationConfig,
): Promise<SpritesheetMetadata> {
  ConsoleFormatter.printHeader(
    `${generation.name.toUpperCase()} Compact Pokemon Spritesheet Generator`,
    `Creating space-efficient spritesheet using bin packing algorithm for ${generation.name}`,
  );

  const startTime = Date.now();

  try {
    // Ensure output directories exist
    await fs.mkdir(SPRITESHEET_OUTPUT_DIR, { recursive: true });
    await fs.mkdir(METADATA_OUTPUT_DIR, { recursive: true });

    // Check if sprites directory exists
    if (!(await fileExists(generation.spritesDir))) {
      throw new Error(
        `Sprites directory not found: ${generation.spritesDir}. Please run the scraper first.`,
      );
    }

    // Load sprite data
    const spriteInfos = await loadSpriteData(generation);

    if (spriteInfos.length === 0) {
      ConsoleFormatter.warn("No Pokemon data found");
      throw new Error("No Pokemon data found");
    }

    // Generate spritesheet
    const metadata = await generateSpritesheet(spriteInfos, generation);

    // Calculate comparison with old grid method
    const validSprites = spriteInfos.filter((s) => s.exists && s.contentBounds);
    const oldGridColumns = Math.ceil(Math.sqrt(validSprites.length));
    const oldGridRows = Math.ceil(validSprites.length / oldGridColumns);
    const oldSheetWidth = oldGridColumns * 68; // Original sprite width
    const oldSheetHeight = oldGridRows * 56; // Original sprite height
    const oldArea = oldSheetWidth * oldSheetHeight;
    const newArea = metadata.sheetWidth * metadata.sheetHeight;
    const spaceSaving = ((oldArea - newArea) / oldArea) * 100;

    // Calculate stats
    const duration = Date.now() - startTime;
    const outputFile = await fs.stat(
      path.join(SPRITESHEET_OUTPUT_DIR, generation.outputFilename),
    );

    // Success summary
    ConsoleFormatter.printSummary(
      `${generation.name.toUpperCase()} Compact Spritesheet Generation Complete!`,
      [
        {
          color: "cyan",
          label: "Generation",
          value: generation.name.toUpperCase(),
        },
        { color: "blue", label: "Total Pokemon", value: spriteInfos.length },
        {
          color: "green",
          label: "Sprites included",
          value: metadata.includedSprites,
        },
        {
          color: "yellow",
          label: "Missing sprites",
          value: metadata.totalSprites - metadata.includedSprites,
        },
        {
          color: "cyan",
          label: "New dimensions",
          value: `${metadata.sheetWidth}x${metadata.sheetHeight}px`,
        },
        {
          color: "red",
          label: "Old dimensions",
          value: `${oldSheetWidth}x${oldSheetHeight}px`,
        },
        {
          color: "green",
          label: "Space efficiency",
          value: `${metadata.spaceEfficiency.toFixed(1)}%`,
        },
        {
          color: "green",
          label: "Space saved",
          value: `${spaceSaving.toFixed(1)}%`,
        },
        {
          color: "green",
          label: "File size",
          value: ConsoleFormatter.formatFileSize(outputFile.size),
        },
        { color: "cyan", label: "Algorithm", value: metadata.algorithm },
        {
          color: "yellow",
          label: "Duration",
          value: ConsoleFormatter.formatDuration(duration),
        },
      ],
    );

    return metadata;
  } catch (error) {
    ConsoleFormatter.error(
      `Error generating ${generation.name} spritesheet: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

/**
 * Main spritesheet generation function
 */
async function generatePokemonSpritesheets(): Promise<void> {
  ConsoleFormatter.printHeader(
    "Multi-Generation Pokemon Spritesheet Generator",
    "Creating space-efficient spritesheets for both Gen 7 and Gen 8 using bin packing algorithm",
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
        ConsoleFormatter.error(
          `Failed to generate ${generation.name} spritesheet: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    // Final summary
    const duration = Date.now() - startTime;
    ConsoleFormatter.printSummary(
      "Multi-Generation Spritesheet Generation Complete!",
      [
        {
          color: "blue",
          label: "Generations processed",
          value: GENERATIONS.length,
        },
        {
          color: "green",
          label: "Successful generations",
          value: successCount,
        },
        { color: "red", label: "Failed generations", value: errorCount },
        {
          color: "yellow",
          label: "Total duration",
          value: ConsoleFormatter.formatDuration(duration),
        },
      ],
    );

    if (errorCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    ConsoleFormatter.error(
      `Error in multi-generation spritesheet generation: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

runDirectScript(import.meta.url, generatePokemonSpritesheets);

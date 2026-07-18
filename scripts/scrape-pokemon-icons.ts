#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { ConsoleFormatter } from "./utils/console-utils";
import { normalizePokemonNameForSprite } from "./utils/pokemon-name-utils";
import {
  downloadSpriteImage,
  type SpriteDownloadConfig,
  type SpriteDownloadIcon,
  spriteFileExists,
} from "./utils/sprite-download-utils";
import {
  BasePokemonEntrySchema,
  getSpriteSourcePaths,
  loadJsonFile,
} from "./utils/sprite-source-utils";

const {
  baseEntriesPath: BASE_ENTRIES_PATH,
  spritesBaseDir: SPRITES_BASE_DIR,
  gen7SpritesDir: GEN7_SPRITES_DIR,
  gen8SpritesDir: GEN8_SPRITES_DIR,
} = getSpriteSourcePaths(import.meta.url);
const GEN7_ICON_BASE_URL =
  "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/regular";
const GEN8_ICON_BASE_URL =
  "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular";
const EGG_SPRITE_URL =
  "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/egg.png";

export type PokemonEntry = {
  id: number;
  name: string;
};

export type PokemonIcon = SpriteDownloadIcon;
export type GenerationConfig = SpriteDownloadConfig;

const GENERATIONS: GenerationConfig[] = [
  {
    name: "gen7",
    baseUrl: GEN7_ICON_BASE_URL,
    spritesDir: GEN7_SPRITES_DIR,
    eggSpriteUrl:
      "https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/egg.png",
  },
  {
    name: "gen8",
    baseUrl: GEN8_ICON_BASE_URL,
    spritesDir: GEN8_SPRITES_DIR,
    eggSpriteUrl: EGG_SPRITE_URL,
  },
];

type DownloadStats = {
  downloaded: number;
  skipped: number;
  errors: number;
};

const ICON_BATCH_SIZE = 10;
const BATCH_DELAY_MS = 50;

function getGenerationConfig(
  generation: PokemonIcon["generation"],
): GenerationConfig {
  const config = GENERATIONS.find((item) => item.name === generation);
  if (!config)
    throw new Error(`Missing sprite configuration for ${generation}`);
  return config;
}

async function downloadIconBatch(icons: PokemonIcon[]): Promise<DownloadStats> {
  const results = await Promise.all(
    icons.map(async (icon) => {
      const config = getGenerationConfig(icon.generation);
      const filePath = path.join(config.spritesDir, icon.filename);
      const skipped = await spriteFileExists(filePath);
      const success = await downloadSpriteImage(
        icon,
        config,
        ConsoleFormatter.error,
      );
      return { skipped, success };
    }),
  );

  return results.reduce<DownloadStats>(
    (stats, { skipped, success }) => {
      if (success === false) {
        stats.errors++;
      } else if (skipped) {
        stats.skipped++;
      } else {
        stats.downloaded++;
      }
      return stats;
    },
    { downloaded: 0, skipped: 0, errors: 0 },
  );
}

async function downloadGenerationIcons(
  icons: PokemonIcon[],
  generationLabel: string,
  completedIcons: number,
  stats: DownloadStats,
  progressBar: ReturnType<typeof ConsoleFormatter.createProgressBar>,
): Promise<void> {
  ConsoleFormatter.working(`Downloading ${generationLabel} sprites...`);

  for (let i = 0; i < icons.length; i += ICON_BATCH_SIZE) {
    const batch = icons.slice(i, i + ICON_BATCH_SIZE);
    const batchStats = await downloadIconBatch(batch);
    stats.downloaded += batchStats.downloaded;
    stats.skipped += batchStats.skipped;
    stats.errors += batchStats.errors;

    progressBar.update(
      Math.min(i + ICON_BATCH_SIZE, icons.length) + completedIcons,
      {
        status: `${generationLabel}: New: ${stats.downloaded}, Skipped: ${stats.skipped}, Errors: ${stats.errors}`,
      },
    );

    if (i + ICON_BATCH_SIZE < icons.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }
}

/**
 * Check if a file already exists
 */
/**
 * Load Pokemon data and construct icon URLs for both generations
 */
async function loadPokemonIcons(): Promise<PokemonIcon[]> {
  ConsoleFormatter.printSection("Loading Pokemon Data");

  try {
    // Load Pokemon entries from JSON file
    const entriesData = await ConsoleFormatter.withSpinner(
      "Loading Pokemon entries...",
      async () => {
        return loadJsonFile(BASE_ENTRIES_PATH, BasePokemonEntrySchema.array());
      },
    );

    ConsoleFormatter.success(`Loaded ${entriesData.length} Pokemon entries`);

    // Transform entries to icon URLs for both generations
    ConsoleFormatter.working("Constructing icon URLs for both generations...");

    const icons: PokemonIcon[] = [];

    // Generate icons for each generation
    for (const config of GENERATIONS) {
      const generationIcons = entriesData.map((entry) => {
        const urlName = normalizePokemonNameForSprite(entry.name);
        const filename = `${urlName}.png`;
        const url = `${config.baseUrl}/${filename}`;

        return {
          id: entry.id,
          name: entry.name,
          url: url,
          filename: filename,
          generation: config.name,
        };
      });

      // Add the special egg entry for this generation
      generationIcons.unshift({
        id: -1,
        name: "Egg",
        url: config.eggSpriteUrl,
        filename: "egg.png",
        generation: config.name,
      });

      icons.push(...generationIcons);
    }

    ConsoleFormatter.success(
      `Generated ${icons.length} icon URLs (${GENERATIONS.length} generations × ${entriesData.length + 1} entries each)`,
    );
    return icons;
  } catch (error) {
    ConsoleFormatter.error(
      `Error loading Pokemon data: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    throw error;
  }
}

/**
 * Download all Pokemon icons with progress tracking
 */
export async function downloadAllIcons(
  icons: PokemonIcon[],
): Promise<{ downloaded: number; skipped: number; errors: number }> {
  ConsoleFormatter.printSection(
    "Downloading Pokemon Icons for Both Generations",
  );

  // Group icons by generation for better progress tracking
  const gen7Icons = icons.filter((icon) => icon.generation === "gen7");
  const gen8Icons = icons.filter((icon) => icon.generation === "gen8");

  ConsoleFormatter.info(
    `Gen 7 icons: ${gen7Icons.length}, Gen 8 icons: ${gen8Icons.length}`,
  );

  const stats: DownloadStats = { downloaded: 0, skipped: 0, errors: 0 };

  const progressBar = ConsoleFormatter.createProgressBar(icons.length);

  await downloadGenerationIcons(gen7Icons, "Gen 7", 0, stats, progressBar);
  await downloadGenerationIcons(
    gen8Icons,
    "Gen 8",
    gen7Icons.length,
    stats,
    progressBar,
  );

  progressBar.stop();

  if (stats.errors > 0) {
    ConsoleFormatter.warn(`Download completed with ${stats.errors} errors`);
  } else {
    ConsoleFormatter.success("All icons downloaded successfully!");
  }

  return stats;
}

/**
 * Main scraping function
 */
async function scrapePokemonIcons(): Promise<void> {
  ConsoleFormatter.printHeader(
    "Pokemon Icons Downloader (Gen 7 + Gen 8)",
    "Downloading Pokemon sprite icons from PokéSprite repository for both generations",
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
      ConsoleFormatter.warn("No Pokemon data found");
      return;
    }

    // Download all icons
    const stats = await downloadAllIcons(icons);

    // Calculate stats
    const duration = Date.now() - startTime;
    const gen7Stats = await fs.readdir(GEN7_SPRITES_DIR);
    const gen8Stats = await fs.readdir(GEN8_SPRITES_DIR);
    const gen7FileCount = gen7Stats.filter((file) =>
      file.endsWith(".png"),
    ).length;
    const gen8FileCount = gen8Stats.filter((file) =>
      file.endsWith(".png"),
    ).length;

    // Success summary
    ConsoleFormatter.printSummary("Pokemon Icons Download Complete!", [
      {
        label: "Total Pokemon",
        value: icons.length / GENERATIONS.length,
        color: "blue",
      },
      { label: "Generations", value: GENERATIONS.length, color: "cyan" },
      { label: "New downloads", value: stats.downloaded, color: "green" },
      { label: "Already existed", value: stats.skipped, color: "yellow" },
      { label: "Failed downloads", value: stats.errors, color: "red" },
      { label: "Gen 7 files", value: gen7FileCount, color: "green" },
      { label: "Gen 8 files", value: gen8FileCount, color: "green" },
      { label: "Gen 7 directory", value: GEN7_SPRITES_DIR, color: "cyan" },
      { label: "Gen 8 directory", value: GEN8_SPRITES_DIR, color: "cyan" },
      {
        label: "Duration",
        value: ConsoleFormatter.formatDuration(duration),
        color: "yellow",
      },
    ]);
  } catch (error) {
    ConsoleFormatter.error(
      `Error downloading Pokemon icons: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    process.exit(1);
  }
}

// fallow-ignore-next-line code-duplication
if (import.meta.url === `file://${process.argv[1]}`) {
  void scrapePokemonIcons();
}

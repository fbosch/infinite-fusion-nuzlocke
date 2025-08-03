#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';
import { ConsoleFormatter } from './utils/console-utils';

const POKEDEX_URL = 'https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex';

export type DexEntry = { id: number, name: string };

async function scrapeDexEntries(): Promise<{ id: number, name: string }[]> {
  ConsoleFormatter.printHeader('Scraping Pokédex', 'Scraping Pokédex entries from the wiki');
  const startTime = Date.now();

  try {
    // Fetch the webpage
    const response = await ConsoleFormatter.withSpinner(
      'Fetching Pokédex page...',
      () => fetch(POKEDEX_URL)
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await ConsoleFormatter.withSpinner(
      'Parsing HTML content...',
      () => response.text()
    );

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Extract dex numbers from the table
    const dexEntries: { id: number, name: string }[] = [];

    ConsoleFormatter.working('Extracting Pokédex entries from tables...');

    // Look for table rows with dex numbers
    // The structure appears to be: first column contains the dex number
    $('table tr').each((index: number, element: any) => {
      const firstCell = $(element).find('td').first();
      const dexText = firstCell.text().trim();
      const thirdCell = $(element).find('td').eq(2);
      const nameText = thirdCell.text().trim();

      // Check if this looks like a dex number (should be a number)
      const dexNumber = parseInt(dexText);
      if (!isNaN(dexNumber) && dexNumber > 0) {
        dexEntries.push({
          id: dexNumber,
          name: nameText
        });
      }
    });

    ConsoleFormatter.success(`Found ${dexEntries.length} unique Pokédex entries`);

    // Write to JSON file
    ConsoleFormatter.info('Saving entries to file...');
    const outputPath = path.join(process.cwd(), 'data/shared/base-entries.json');
    
    // Ensure the shared directory exists
    const sharedDir = path.dirname(outputPath);
    await fs.mkdir(sharedDir, { recursive: true });
    
    await fs.writeFile(outputPath, JSON.stringify(dexEntries, null, 2));

    const fileStats = await fs.stat(outputPath);
    const duration = Date.now() - startTime;

    // Success summary
    ConsoleFormatter.printSummary('Pokédex Scraping Complete!', [
      { label: 'Output saved to', value: outputPath, color: 'cyan' },
      { label: 'Total entries', value: dexEntries.length, color: 'green' },
      { label: 'File size', value: ConsoleFormatter.formatFileSize(fileStats.size), color: 'cyan' },
      { label: 'Duration', value: ConsoleFormatter.formatDuration(duration), color: 'yellow' }
    ]);

    return dexEntries;

  } catch (error) {
    ConsoleFormatter.error(`Error scraping Pokédex: ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run the scraper
scrapeDexEntries(); 
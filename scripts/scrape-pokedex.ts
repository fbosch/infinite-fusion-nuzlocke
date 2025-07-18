#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

const POKEDEX_URL = 'https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex';

export type DexEntry = { id: number, name: string };

async function scrapeDexEntries(): Promise<{ id: number, name: string }[]> {
  try {
    console.log('Fetching Pokédex page...');

    // Fetch the webpage
    const response = await fetch(POKEDEX_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    console.log('Page fetched successfully. Parsing HTML...');

    // Parse HTML with cheerio
    const $ = cheerio.load(html);

    // Extract dex numbers from the table
    const dexEntries: { id: number, name: string }[] = [];

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

    // Remove duplicates and sort

    console.log(`Found ${dexEntries.length} unique Pokédex entries.`);

    // Write to JSON file
    const outputPath = path.join(process.cwd(), '/data/base-entries.json');
    await fs.writeFile(outputPath, JSON.stringify(dexEntries, null, 2));

    return dexEntries;

  } catch (error) {
    console.error('❌ Error scraping Pokédex:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the scraper
scrapeDexEntries(); 
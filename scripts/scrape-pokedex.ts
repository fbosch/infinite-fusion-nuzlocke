#!/usr/bin/env node

import * as cheerio from 'cheerio';
import fs from 'fs/promises';
import path from 'path';

const POKEDEX_URL = 'https://infinitefusion.fandom.com/wiki/Pok%C3%A9dex';

async function scrapePokeDexNumbers(): Promise<number[]> {
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
    const dexNumbers: number[] = [];

    // Look for table rows with dex numbers
    // The structure appears to be: first column contains the dex number
    $('table tr').each((index: number, element: any) => {
      const firstCell = $(element).find('td').first();
      const dexText = firstCell.text().trim();

      // Check if this looks like a dex number (should be a number)
      const dexNumber = parseInt(dexText);
      if (!isNaN(dexNumber) && dexNumber > 0) {
        dexNumbers.push(dexNumber);
      }
    });

    // Remove duplicates and sort
    const uniqueDexNumbers = [...new Set(dexNumbers)].sort((a, b) => a - b);

    console.log(`Found ${uniqueDexNumbers.length} unique Pokédex entries.`);
    console.log(`Range: ${Math.min(...uniqueDexNumbers)} - ${Math.max(...uniqueDexNumbers)}`);

    // Write to JSON file
    const outputPath = path.join(process.cwd(), '/data/base-entries.json');
    await fs.writeFile(outputPath, JSON.stringify(uniqueDexNumbers, null, 2));

    console.log(`✅ Successfully scraped ${uniqueDexNumbers.length} Pokédex numbers!`);
    console.log(`📁 Output saved to: ${outputPath}`);

    return uniqueDexNumbers;

  } catch (error) {
    console.error('❌ Error scraping Pokédex:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the scraper
scrapePokeDexNumbers(); 
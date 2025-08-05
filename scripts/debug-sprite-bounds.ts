#!/usr/bin/env node

import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPRITES_DIR = path.join(__dirname, 'sprites', 'pokemon-icons');

/**
 * Analyze a sprite's content bounds with different alpha thresholds
 */
async function analyzeSpriteBounds(spriteName: string, threshold = 0) {
  const spritePath = path.join(SPRITES_DIR, `${spriteName.toLowerCase()}.png`);
  
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
    
    // Find bounds of pixels with alpha > threshold
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const pixelIndex = (y * info.width + x) * info.channels;
        const alpha = data[pixelIndex + 3];
        
        if (alpha > threshold) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    if (maxX === -1) {
      return null;
    }
    
    return {
      originalWidth: info.width,
      originalHeight: info.height,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      threshold
    };
  } catch (error) {
    console.error(`Error analyzing ${spriteName}:`, error);
    return null;
  }
}

async function main() {
  const problematicSprites = ['wailord', 'metagross'];
  
  console.log('Analyzing problematic sprites with different alpha thresholds:\n');
  
  for (const spriteName of problematicSprites) {
    console.log(`=== ${spriteName.toUpperCase()} ===`);
    
    // Test different alpha thresholds
    for (const threshold of [0, 10, 25, 50]) {
      const analysis = await analyzeSpriteBounds(spriteName, threshold);
      if (analysis) {
        console.log(`Threshold ${threshold}: ${analysis.bounds.width}x${analysis.bounds.height} at (${analysis.bounds.x}, ${analysis.bounds.y})`);
      }
    }
    console.log();
  }
}

main();
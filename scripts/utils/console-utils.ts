/**
 * Shared Console Utilities for Infinite Fusion Scripts
 * 
 * This utility provides consistent formatting, colors, progress bars, and messaging
 * across all scripts in the project. It ensures a professional and unified console experience.
 * 
 * Features:
 * - Color-coded console messages with ANSI escape codes
 * - Progress bars with ETA and status updates
 * - Loading spinners for indeterminate operations
 * - Professional summary formatting
 * 
 * Usage:
 * ```typescript
 * import { ConsoleFormatter } from './console-utils';
 * 
 * ConsoleFormatter.printHeader('My Script', 'Description');
 * ConsoleFormatter.success('Operation completed!');
 * const progressBar = ConsoleFormatter.createProgressBar(100);
 * await ConsoleFormatter.withSpinner('Loading...', async () => { ... });
 * ```
 */

import * as cliProgress from 'cli-progress';
import { formatFileSize, formatDuration } from './format-utils';

// Simple color functions using ANSI escape codes
export const colors = {
  reset: '\x1b[0m',
  red: (str: string) => `\x1b[31m${str}\x1b[0m`,
  green: (str: string) => `\x1b[32m${str}\x1b[0m`,
  yellow: (str: string) => `\x1b[33m${str}\x1b[0m`,
  blue: (str: string) => `\x1b[34m${str}\x1b[0m`,
  magenta: (str: string) => `\x1b[35m${str}\x1b[0m`,
  cyan: (str: string) => `\x1b[36m${str}\x1b[0m`,
  white: (str: string) => `\x1b[37m${str}\x1b[0m`,
  gray: (str: string) => `\x1b[90m${str}\x1b[0m`,
  bold: {
    green: (str: string) => `\x1b[1m\x1b[32m${str}\x1b[0m`,
    magenta: (str: string) => `\x1b[1m\x1b[35m${str}\x1b[0m`,
    red: (str: string) => `\x1b[1m\x1b[31m${str}\x1b[0m`,
    yellow: (str: string) => `\x1b[1m\x1b[33m${str}\x1b[0m`,
    blue: (str: string) => `\x1b[1m\x1b[34m${str}\x1b[0m`,
    white: (str: string) => `\x1b[1m\x1b[37m${str}\x1b[0m`,
  }
};

// Progress bar configurations
export const progressBarConfigs = {
  standard: {
    format: colors.cyan('{bar}') + ' | {percentage}% | {value}/{total} | ETA: {eta}s | {status}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    stopOnComplete: true,
    clearOnComplete: false
  },

  mini: {
    format: colors.yellow('  {bar}') + ' | {percentage}% | {value}/{total} | {status}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true,
    stopOnComplete: true,
    clearOnComplete: true
  }
};

// Console formatting utilities
export class ConsoleFormatter {

  /**
   * Print a beautiful header for a script
   */
  static printHeader(title: string, subtitle?: string) {
    console.debug(colors.bold.magenta(`\n🔄 ${title}`));
    console.debug(colors.gray('═'.repeat(50)));
    if (subtitle) {
      console.debug(colors.gray(subtitle));
      console.debug(colors.gray('─'.repeat(50)));
    }
  }

  /**
   * Print a section header
   */
  static printSection(title: string) {
    console.debug(colors.cyan(`\n${title}`));
  }

  /**
   * Print success message
   */
  static success(message: string) {
    console.debug(colors.green(`✓ ${message}`));
  }

  /**
   * Print info message
   */
  static info(message: string) {
    console.debug(colors.yellow(`${message}`));
  }

  /**
   * Print working/processing message
   */
  static working(message: string) {
    console.debug(colors.cyan(`🔄 ${message}`));
  }

  /**
   * Print error message
   */
  static error(message: string) {
    console.error(colors.red(`❌ ${message}`));
  }

  /**
   * Print warning message
   */
  static warn(message: string) {
    console.warn(colors.yellow(`⚠️ ${message}`));
  }

  /**
   * Print completion summary
   */
  static printSummary(title: string, items: Array<{ label: string; value: string | number; color?: keyof typeof colors }>) {
    console.debug(colors.gray('═'.repeat(50)));
    console.debug(colors.bold.green(`🎉 ${title}`));
    console.debug(colors.gray('═'.repeat(50)));

    items.forEach(({ label, value, color = 'white' }) => {
      const colorFunc = colors[color as keyof typeof colors] as (str: string) => string;
      console.debug(colors.white(`${label}: ${colorFunc(value.toString())}`));
    });

    console.debug(colors.gray('═'.repeat(50)));
  }

  /**
   * Create a standard progress bar
   */
  static createProgressBar(total: number, status = 'Starting...'): cliProgress.SingleBar {
    const bar = new cliProgress.SingleBar(progressBarConfigs.standard, cliProgress.Presets.shades_classic);
    bar.start(total, 0, { status });
    return bar;
  }

  /**
   * Create a mini progress bar (for sub-processes)
   */
  static createMiniProgressBar(total: number, status = 'Processing...'): cliProgress.SingleBar {
    const bar = new cliProgress.SingleBar(progressBarConfigs.mini, cliProgress.Presets.shades_grey);
    bar.start(total, 0, { status });
    return bar;
  }

  /**
   * Print a simple loading spinner for operations without known progress
   */
  static async withSpinner<T>(message: string, operation: () => Promise<T>): Promise<T> {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;

    const interval = setInterval(() => {
      process.stdout.write(`\r${colors.cyan(frames[frameIndex])} ${message}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 80);

    try {
      const result = await operation();
      clearInterval(interval);
      process.stdout.write(`\r${colors.green('✓')} ${message}\n`);
      return result;
    } catch (error) {
      clearInterval(interval);
      process.stdout.write(`\r${colors.red('✗')} ${message}\n`);
      throw error;
    }
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes: number): string {
    return formatFileSize(bytes);
  }

  /**
   * Format duration in human readable format
   */
  static formatDuration(ms: number): string {
    return formatDuration(ms);
  }
} 
/**
 * Format Utilities
 * 
 * Pure functions for formatting data like file sizes, durations, and other values.
 * These utilities have no side effects and are easily testable.
 */

/**
 * Formats a file size in bytes to a human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (typeof bytes !== 'number' || bytes < 0 || isNaN(bytes)) {
    return '0 B';
  }

  if (bytes === 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const clampedIndex = Math.min(unitIndex, units.length - 1);

  const value = bytes / Math.pow(1024, clampedIndex);
  const formattedValue = clampedIndex === 0 ? value.toString() : value.toFixed(1);

  return `${formattedValue} ${units[clampedIndex]}`;
}

/**
 * Formats a duration in milliseconds to a human-readable string
 */
export function formatDuration(milliseconds: number): string {
  if (typeof milliseconds !== 'number' || milliseconds < 0 || isNaN(milliseconds)) {
    return '0ms';
  }

  if (milliseconds < 1000) {
    return `${Math.round(milliseconds)}ms`;
  }

  const seconds = milliseconds / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  const hourStr = `${hours}h`;
  const minuteStr = remainingMinutes > 0 ? ` ${remainingMinutes}m` : '';
  const secondStr = remainingSeconds > 0 ? ` ${remainingSeconds}s` : '';

  return `${hourStr}${minuteStr}${secondStr}`;
}

/**
 * Formats a number with commas for thousands separators
 */
export function formatNumber(num: number): string {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0';
  }

  return num.toLocaleString();
}

/**
 * Formats a percentage to a fixed number of decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  if (typeof value !== 'number' || isNaN(value)) {
    return '0%';
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncates text to a maximum length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (typeof text !== 'string') {
    if (text == null) {
      return '';
    }
    text = String(text);
  }

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Pads a string to a minimum width with spaces
 */
export function padString(str: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  if (typeof str !== 'string') {
    str = String(str);
  }

  if (str.length >= width) {
    return str;
  }

  const padding = width - str.length;

  switch (align) {
    case 'right':
      return ' '.repeat(padding) + str;
    case 'center':
      const leftPad = Math.floor(padding / 2);
      const rightPad = padding - leftPad;
      return ' '.repeat(leftPad) + str + ' '.repeat(rightPad);
    case 'left':
    default:
      return str + ' '.repeat(padding);
  }
} 
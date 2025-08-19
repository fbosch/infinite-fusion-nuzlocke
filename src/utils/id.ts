import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique identifier using UUID v4
 * @returns A unique UUID string
 */
export function generateId(): string {
  return uuidv4();
}

/**
 * Generate a prefixed unique identifier with timestamp
 * @param prefix - The prefix to add before the UUID
 * @returns A unique prefixed ID string
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}_${Date.now()}_${uuidv4()}`;
}

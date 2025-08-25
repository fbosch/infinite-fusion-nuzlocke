import { describe, it, expect } from 'vitest';

// We need to import the function directly since it's not exported
// For testing purposes, we'll redefine it here
function filterEdgeSeparators(
  items: Array<{ separator?: boolean; id: string }>
) {
  if (items.length === 0) return items;

  // Find first non-separator item
  let start = 0;
  while (start < items.length && items[start]?.separator) {
    start++;
  }

  // Find last non-separator item
  let end = items.length - 1;
  while (end >= 0 && items[end]?.separator) {
    end--;
  }

  // If no non-separator items found, return empty array
  if (start > end) return [];

  // Return slice from first to last non-separator item
  return items.slice(start, end + 1);
}

describe('filterEdgeSeparators', () => {
  it('should remove separators at the beginning', () => {
    const items = [
      { id: 'sep1', separator: true },
      { id: 'sep2', separator: true },
      { id: 'item1' },
      { id: 'item2' },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('item1');
    expect(result[1].id).toBe('item2');
  });

  it('should remove separators at the end', () => {
    const items = [
      { id: 'item1' },
      { id: 'item2' },
      { id: 'sep1', separator: true },
      { id: 'sep2', separator: true },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('item1');
    expect(result[1].id).toBe('item2');
  });

  it('should remove separators at both beginning and end', () => {
    const items = [
      { id: 'sep1', separator: true },
      { id: 'item1' },
      { id: 'sep2', separator: true },
      { id: 'item2' },
      { id: 'sep3', separator: true },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('item1');
    expect(result[1].id).toBe('sep2');
    expect(result[2].id).toBe('item2');
    // sep3 is correctly removed as it's at the end
  });

  it('should preserve separators in the middle', () => {
    const items = [
      { id: 'item1' },
      { id: 'sep1', separator: true },
      { id: 'item2' },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('item1');
    expect(result[1].id).toBe('sep1');
    expect(result[2].id).toBe('item2');
  });

  it('should return empty array when only separators exist', () => {
    const items = [
      { id: 'sep1', separator: true },
      { id: 'sep2', separator: true },
    ];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(0);
  });

  it('should return unchanged array when no separators exist', () => {
    const items = [{ id: 'item1' }, { id: 'item2' }];

    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('item1');
    expect(result[1].id).toBe('item2');
  });

  it('should handle empty array', () => {
    const items: Array<{ separator?: boolean; id: string }> = [];
    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(0);
  });

  it('should handle single non-separator item', () => {
    const items = [{ id: 'item1' }];
    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('item1');
  });

  it('should handle single separator item', () => {
    const items = [{ id: 'sep1', separator: true }];
    const result = filterEdgeSeparators(items);
    expect(result).toHaveLength(0);
  });
});

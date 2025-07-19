import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import {
  loadPokemonData,
  loadPokemonNameMap,
  loadDexEntries,
  checkDataFiles,
  clearDataCache,
  getCacheStatus,
  type DexEntry,
} from '../scripts/utils/data-loading-utils';

// Mock fs and path modules
vi.mock('fs/promises');
vi.mock('path');

const mockFs = vi.mocked(fs);
const mockPath = vi.mocked(path);

describe('Data Loading Utilities', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Clear cache before each test
    clearDataCache();

    // Mock path.join to return predictable paths
    mockPath.join.mockImplementation((...segments) => segments.join('/'));

    // Mock process.cwd()
    vi.stubGlobal('process', { cwd: () => '/mock/project' });
  });

  afterEach(() => {
    // Clean up cache after each test
    clearDataCache();
    vi.unstubAllGlobals();
  });

  describe('loadPokemonData', () => {
    const mockPokemonData = [
      {
        id: 1,
        nationalDexId: 1,
        name: 'Bulbasaur',
        types: [{ name: 'grass' }],
        species: {
          is_legendary: false,
          is_mythical: false,
          generation: 'generation-i',
          evolution_chain: {
            url: 'https://pokeapi.co/api/v2/evolution-chain/1/',
          },
        },
        evolution: {
          evolves_to: [
            {
              id: 2,
              name: 'ivysaur',
              min_level: 16,
              trigger: 'level-up',
            },
          ],
        },
      },
      {
        id: 25,
        nationalDexId: 25,
        name: 'Pikachu',
        types: [{ name: 'electric' }],
        species: {
          is_legendary: false,
          is_mythical: false,
          generation: 'generation-i',
          evolution_chain: {
            url: 'https://pokeapi.co/api/v2/evolution-chain/10/',
          },
        },
        evolution: {
          evolves_to: [
            {
              id: 26,
              name: 'raichu',
              item: 'thunder-stone',
              trigger: 'use-item',
            },
          ],
          evolves_from: {
            id: 172,
            name: 'pichu',
            min_level: 10,
            trigger: 'level-up',
          },
        },
      },
    ];

    it('should load Pokemon data successfully', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPokemonData));

      const result = await loadPokemonData();

      expect(result).toEqual(mockPokemonData);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/mock/project/data/pokemon-data.json',
        'utf8'
      );
    });

    it('should cache Pokemon data on subsequent calls', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPokemonData));

      // First call
      const result1 = await loadPokemonData();
      // Second call
      const result2 = await loadPokemonData();

      expect(result1).toEqual(mockPokemonData);
      expect(result2).toEqual(mockPokemonData);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should reload data when forceReload is true', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPokemonData));

      // First call
      await loadPokemonData();
      // Second call with forceReload
      await loadPokemonData(true);

      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });

    it('should validate Pokemon data structure', async () => {
      // Mock invalid data - not an array
      mockFs.readFile.mockResolvedValue(JSON.stringify({ invalid: 'data' }));

      await expect(loadPokemonData()).rejects.toThrow(
        'Pokemon data file does not contain an array'
      );
    });

    it('should validate individual Pokemon entries', async () => {
      const invalidPokemonData = [
        { id: 1, name: 'Valid' },
        { id: null, name: 'Invalid' }, // Missing id
      ];
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidPokemonData));

      await expect(loadPokemonData()).rejects.toThrow(
        'Invalid Pokemon data entry: missing id or name'
      );
    });

    it('should handle file read errors', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(loadPokemonData()).rejects.toThrow(
        'Error loading Pokemon data: File not found'
      );
    });

    it('should handle JSON parse errors', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');

      await expect(loadPokemonData()).rejects.toThrow(
        'Error loading Pokemon data:'
      );
    });
  });

  describe('loadPokemonNameMap', () => {
    const mockPokemonData = [
      {
        id: 1,
        nationalDexId: 1,
        name: 'Bulbasaur',
        types: [],
        species: {},
        evolution: {},
      },
      {
        id: 25,
        nationalDexId: 25,
        name: 'Pikachu',
        types: [],
        species: {},
        evolution: {},
      },
    ];

    it('should load and build Pokemon name map', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPokemonData));

      const nameMap = await loadPokemonNameMap();

      expect(nameMap.nameToId.get('Bulbasaur')).toBe(1);
      expect(nameMap.nameToId.get('Pikachu')).toBe(25);
      expect(nameMap.idToName.get(1)).toBe('Bulbasaur');
      expect(nameMap.idToName.get(25)).toBe('Pikachu');
    });

    it('should cache name map on subsequent calls', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPokemonData));

      // First call
      const nameMap1 = await loadPokemonNameMap();
      // Second call
      const nameMap2 = await loadPokemonNameMap();

      expect(nameMap1).toBe(nameMap2); // Same object reference due to caching
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should reload when forceReload is true', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockPokemonData));

      // First call
      await loadPokemonNameMap();
      // Second call with forceReload
      await loadPokemonNameMap(true);

      expect(mockFs.readFile).toHaveBeenCalledTimes(2);
    });
  });

  describe('loadDexEntries', () => {
    const mockDexEntries: DexEntry[] = [
      { id: 1, name: 'Bulbasaur' },
      { id: 25, name: 'Pikachu' },
    ];

    it('should load dex entries successfully', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDexEntries));

      const result = await loadDexEntries();

      expect(result).toEqual(mockDexEntries);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        '/mock/project/data/base-entries.json',
        'utf8'
      );
    });

    it('should cache dex entries on subsequent calls', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockDexEntries));

      // First call
      const result1 = await loadDexEntries();
      // Second call
      const result2 = await loadDexEntries();

      expect(result1).toEqual(mockDexEntries);
      expect(result2).toEqual(mockDexEntries);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
    });

    it('should validate dex entries structure', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ invalid: 'data' }));

      await expect(loadDexEntries()).rejects.toThrow(
        'Dex entries file does not contain an array'
      );
    });

    it('should validate individual dex entries', async () => {
      const invalidDexEntries = [
        { id: 1, name: 'Valid' },
        { id: null, name: 'Invalid' },
      ];
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidDexEntries));

      await expect(loadDexEntries()).rejects.toThrow(
        'Invalid dex entry: missing id or name'
      );
    });
  });

  describe('checkDataFiles', () => {
    it('should check all required data files', async () => {
      // Mock all files as existing
      mockFs.access.mockResolvedValue(undefined);

      const result = await checkDataFiles();

      expect(result).toEqual({
        pokemonData: true,
        dexEntries: true,
        classicEncounters: true,
        remixEncounters: true,
        locations: true,
      });

      expect(mockFs.access).toHaveBeenCalledTimes(5);
      expect(mockFs.access).toHaveBeenCalledWith(
        '/mock/project/data/pokemon-data.json'
      );
      expect(mockFs.access).toHaveBeenCalledWith(
        '/mock/project/data/base-entries.json'
      );
      expect(mockFs.access).toHaveBeenCalledWith(
        '/mock/project/data/route-encounters-classic.json'
      );
      expect(mockFs.access).toHaveBeenCalledWith(
        '/mock/project/data/route-encounters-remix.json'
      );
      expect(mockFs.access).toHaveBeenCalledWith(
        '/mock/project/data/locations.json'
      );
    });

    it('should handle missing files', async () => {
      // Mock some files as missing
      mockFs.access.mockImplementation(async filePath => {
        const pathStr = String(filePath);
        if (
          pathStr.includes('pokemon-data.json') ||
          pathStr.includes('locations.json')
        ) {
          throw new Error('File not found');
        }
        return undefined;
      });

      const result = await checkDataFiles();

      expect(result).toEqual({
        pokemonData: false,
        dexEntries: true,
        classicEncounters: true,
        remixEncounters: true,
        locations: false,
      });
    });
  });

  describe('clearDataCache', () => {
    it('should clear all cached data', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockData));

      // Load some data to populate cache
      await loadPokemonData();
      await loadDexEntries();

      // Verify cache is populated
      let cacheStatus = getCacheStatus();
      expect(cacheStatus.pokemonData).toBe(true);
      expect(cacheStatus.dexEntries).toBe(true);

      // Clear cache
      clearDataCache();

      // Verify cache is cleared
      cacheStatus = getCacheStatus();
      expect(cacheStatus.pokemonData).toBe(false);
      expect(cacheStatus.pokemonNameMap).toBe(false);
      expect(cacheStatus.dexEntries).toBe(false);
    });
  });

  describe('getCacheStatus', () => {
    it('should return correct cache status', async () => {
      // Initial state
      let status = getCacheStatus();
      expect(status).toEqual({
        pokemonData: false,
        pokemonNameMap: false,
        dexEntries: false,
      });

      // Load Pokemon data
      mockFs.readFile.mockResolvedValue(
        JSON.stringify([{ id: 1, name: 'Test' }])
      );
      await loadPokemonData();

      status = getCacheStatus();
      expect(status.pokemonData).toBe(true);
      expect(status.pokemonNameMap).toBe(false);
      expect(status.dexEntries).toBe(false);

      // Load name map
      await loadPokemonNameMap();

      status = getCacheStatus();
      expect(status.pokemonData).toBe(true);
      expect(status.pokemonNameMap).toBe(true);
      expect(status.dexEntries).toBe(false);

      // Load dex entries
      await loadDexEntries();

      status = getCacheStatus();
      expect(status.pokemonData).toBe(true);
      expect(status.pokemonNameMap).toBe(true);
      expect(status.dexEntries).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should provide meaningful error messages', async () => {
      mockFs.readFile.mockRejectedValue(
        new Error('ENOENT: no such file or directory')
      );

      await expect(loadPokemonData()).rejects.toThrow(
        'Error loading Pokemon data: ENOENT: no such file or directory'
      );
      await expect(loadDexEntries()).rejects.toThrow(
        'Error loading dex entries: ENOENT: no such file or directory'
      );
    });

    it('should handle non-Error objects', async () => {
      mockFs.readFile.mockRejectedValue('String error');

      await expect(loadPokemonData()).rejects.toThrow(
        'Error loading Pokemon data: Unknown error'
      );
    });
  });
});

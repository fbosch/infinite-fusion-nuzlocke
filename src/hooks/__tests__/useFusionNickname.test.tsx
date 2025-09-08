import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFusionNickname } from '../useFusionNickname';
import type { PokemonOptionType } from '@/loaders/pokemon';

// Mock the useBaseEntries hook
vi.mock('../useBaseEntries', () => ({
  useBaseEntries: vi.fn(),
}));

// Mock the fusion naming utility
vi.mock('@/utils/fusionNaming', () => ({
  getFusionDisplayNameFromOptions: vi.fn(),
}));

import { useBaseEntries } from '../useBaseEntries';
import { getFusionDisplayNameFromOptions } from '@/utils/fusionNaming';

const mockUseBaseEntries = vi.mocked(useBaseEntries);
const mockGetFusionDisplayNameFromOptions = vi.mocked(
  getFusionDisplayNameFromOptions
);

// Test data
const mockHeadPokemon: PokemonOptionType = {
  id: 1,
  name: 'Bulbasaur',
  nickname: 'Bulby',
  nationalDexId: 1,
};

const mockBodyPokemon: PokemonOptionType = {
  id: 2,
  name: 'Charmander',
  nickname: 'Charry',
  nationalDexId: 4,
};

const mockHeadPokemonNoNickname: PokemonOptionType = {
  id: 1,
  name: 'Bulbasaur',
  nationalDexId: 1,
};

const mockBodyPokemonNoNickname: PokemonOptionType = {
  id: 2,
  name: 'Charmander',
  nationalDexId: 4,
};

const mockGetPokemonById = vi.fn();

// Test wrapper component
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

describe('useFusionNickname', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseBaseEntries.mockReturnValue({
      baseEntries: [],
      isLoading: false,
      error: null,
      getBaseEntryById: mockGetPokemonById,
    });
    mockGetFusionDisplayNameFromOptions.mockReturnValue('Bulbamander');
  });

  describe('single pokemon (not fusion)', () => {
    it('should return nickname when available', () => {
      const { result } = renderHook(
        () => useFusionNickname(mockHeadPokemon, null, false),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Bulby');
    });

    it('should return name when no nickname', () => {
      const { result } = renderHook(
        () => useFusionNickname(mockHeadPokemonNoNickname, null, false),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Bulbasaur');
    });

    it('should return body pokemon nickname when no head', () => {
      const { result } = renderHook(
        () => useFusionNickname(null, mockBodyPokemon, false),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Charry');
    });

    it('should return empty string when no pokemon', () => {
      const { result } = renderHook(
        () => useFusionNickname(null, null, false),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('');
    });
  });

  describe('fusion pokemon', () => {
    it('should prioritize head pokemon nickname', () => {
      const { result } = renderHook(
        () => useFusionNickname(mockHeadPokemon, mockBodyPokemon, true),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Bulby');
      expect(mockGetFusionDisplayNameFromOptions).not.toHaveBeenCalled();
    });

    it('should fall back to body pokemon nickname when no head nickname', () => {
      const { result } = renderHook(
        () =>
          useFusionNickname(mockHeadPokemonNoNickname, mockBodyPokemon, true),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Charry');
      expect(mockGetFusionDisplayNameFromOptions).not.toHaveBeenCalled();
    });

    it('should use fusion name when no nicknames available', () => {
      const { result } = renderHook(
        () =>
          useFusionNickname(
            mockHeadPokemonNoNickname,
            mockBodyPokemonNoNickname,
            true
          ),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Bulbamander');
      expect(mockGetFusionDisplayNameFromOptions).toHaveBeenCalledWith(
        mockHeadPokemonNoNickname,
        mockBodyPokemonNoNickname,
        mockGetPokemonById
      );
    });

    it('should handle missing body pokemon', () => {
      const { result } = renderHook(
        () => useFusionNickname(mockHeadPokemon, null, true),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Bulby');
    });

    it('should handle missing head pokemon', () => {
      const { result } = renderHook(
        () => useFusionNickname(null, mockBodyPokemon, true),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Charry');
    });

    it('should return empty string when no pokemon in fusion', () => {
      const { result } = renderHook(() => useFusionNickname(null, null, true), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBe('');
    });
  });

  describe('edge cases', () => {
    it('should handle empty nickname strings', () => {
      const pokemonWithEmptyNickname: PokemonOptionType = {
        ...mockHeadPokemonNoNickname,
        nickname: '',
      };

      const { result } = renderHook(
        () =>
          useFusionNickname(
            pokemonWithEmptyNickname,
            mockBodyPokemonNoNickname,
            true
          ),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Bulbamander');
      expect(mockGetFusionDisplayNameFromOptions).toHaveBeenCalled();
    });

    it('should handle undefined nickname', () => {
      const pokemonWithUndefinedNickname: PokemonOptionType = {
        ...mockHeadPokemonNoNickname,
        nickname: undefined,
      };

      const { result } = renderHook(
        () =>
          useFusionNickname(
            pokemonWithUndefinedNickname,
            mockBodyPokemonNoNickname,
            true
          ),
        { wrapper: createWrapper() }
      );

      expect(result.current).toBe('Bulbamander');
      expect(mockGetFusionDisplayNameFromOptions).toHaveBeenCalled();
    });
  });
});

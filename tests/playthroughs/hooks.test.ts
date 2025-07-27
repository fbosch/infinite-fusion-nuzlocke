// Import mocks first (must be at top level for Vitest hoisting)
import './mocks';

// Import shared setup and utilities
import {
  describe,
  it,
  expect,
  beforeEach,
  renderHook,
  act,
  playthroughActions,
  playthroughsStore,
  useActivePlaythrough,
  useIsRemixMode,
  useGameMode,
  useIsRandomizedMode,
  usePlaythroughById,
  useIsLoading,
  useEncounters,
  usePlaythroughsSnapshot,
  createMockPokemon,
  setupPlaythroughTest,
  setupCleanSlate,
} from './setup';

describe('Playthroughs Store - React Hooks', () => {
  // Don't use setupPlaythroughTest in global beforeEach since some tests need empty state
  beforeEach(() => {
    setupCleanSlate();
  });

  describe('usePlaythroughsSnapshot', () => {
    it('should return the store snapshot', () => {
      const { result } = renderHook(() => usePlaythroughsSnapshot());

      // Should return the current state of the store
      expect(result.current.playthroughs).toEqual([]);
      expect(result.current.activePlaythroughId).toBeUndefined();
      expect(result.current.isLoading).toBe(false);
    });

    it('should update when store changes', () => {
      const { result } = renderHook(() => usePlaythroughsSnapshot());

      // Initial state
      expect(result.current.playthroughs).toHaveLength(0);

      // Create a playthrough
      act(() => {
        const id = playthroughActions.createPlaythrough('Test');
        playthroughActions.setActivePlaythrough(id);
      });

      // Should update
      expect(result.current.playthroughs).toHaveLength(1);
      expect(result.current.activePlaythroughId).toBeDefined();
    });
  });

  describe('useActivePlaythrough', () => {
    it('should return null when no active playthrough exists', () => {
      const { result } = renderHook(() => useActivePlaythrough());
      expect(result.current).toBeNull();
    });

    it('should return the active playthrough when one exists', () => {
      // Create and set active playthrough
      setupPlaythroughTest();
      
      const { result } = renderHook(() => useActivePlaythrough());
      expect(result.current).not.toBeNull();
      expect(result.current?.name).toBe('Test Run');
    });

    it('should update when active playthrough changes', () => {
      const { result } = renderHook(() => useActivePlaythrough());

      // Initially null
      expect(result.current).toBeNull();

      // Create first playthrough
      act(() => {
        const id1 = playthroughActions.createPlaythrough('Playthrough 1');
        playthroughActions.setActivePlaythrough(id1);
      });

      expect(result.current?.name).toBe('Playthrough 1');

      // Create and switch to second playthrough
      act(() => {
        const id2 = playthroughActions.createPlaythrough('Playthrough 2');
        playthroughActions.setActivePlaythrough(id2);
      });

      expect(result.current?.name).toBe('Playthrough 2');
    });

    it('should update when active playthrough is modified', () => {
      let playthroughId: string;

      act(() => {
        playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useActivePlaythrough());

      rerender();
      expect(result.current?.gameMode).toBe('classic');

      // Toggle remix mode
      act(() => {
        playthroughActions.toggleRemixMode();
      });

      rerender();
      expect(result.current?.gameMode).toBe('remix');
    });
  });

  describe('useIsRemixMode', () => {
    it('should return false when no active playthrough exists', () => {
      const { result } = renderHook(() => useIsRemixMode());
      expect(result.current).toBe(false);
    });

    it('should return the remix mode status of the active playthrough', () => {
      // Create classic mode playthrough
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Classic Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useIsRemixMode());
      rerender();
      expect(result.current).toBe(false);

      // Toggle to remix mode
      act(() => {
        playthroughActions.toggleRemixMode();
      });

      rerender();
      expect(result.current).toBe(true);
    });

    it('should return true for remix mode playthrough', () => {
      // Create remix mode playthrough
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Remix Run',
          'remix'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => useIsRemixMode());
      expect(result.current).toBe(true);
    });
  });

  describe('useGameMode', () => {
    it('should return classic mode by default when no active playthrough exists', () => {
      const { result } = renderHook(() => useGameMode());
      expect(result.current).toBe('classic');
    });

    it('should return the correct game mode for the active playthrough', () => {
      // Test classic mode
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Classic Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useGameMode());
      rerender();
      expect(result.current).toBe('classic');

      // Test remix mode
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Remix Run',
          'remix'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      rerender();
      expect(result.current).toBe('remix');

      // Test randomized mode
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Randomized Run',
          'randomized'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      rerender();
      expect(result.current).toBe('randomized');
    });

    it('should update when game mode changes', () => {
      let playthroughId: string;

      act(() => {
        playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useGameMode());

      rerender();
      expect(result.current).toBe('classic');

      // Change to remix mode
      act(() => {
        playthroughActions.setGameMode('remix');
      });

      rerender();
      expect(result.current).toBe('remix');

      // Change to randomized mode
      act(() => {
        playthroughActions.setGameMode('randomized');
      });

      rerender();
      expect(result.current).toBe('randomized');

      // Cycle back to classic
      act(() => {
        playthroughActions.setGameMode('classic');
      });

      rerender();
      expect(result.current).toBe('classic');
    });
  });

  describe('useIsRandomizedMode', () => {
    it('should return false when no active playthrough exists', () => {
      const { result } = renderHook(() => useIsRandomizedMode());
      expect(result.current).toBe(false);
    });

    it('should return false for classic mode playthrough', () => {
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Classic Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => useIsRandomizedMode());
      expect(result.current).toBe(false);
    });

    it('should return false for remix mode playthrough', () => {
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Remix Run',
          'remix'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => useIsRandomizedMode());
      expect(result.current).toBe(false);
    });

    it('should return true for randomized mode playthrough', () => {
      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Randomized Run',
          'randomized'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => useIsRandomizedMode());
      expect(result.current).toBe(true);
    });

    it('should update when switching between game modes', () => {
      let playthroughId: string;

      act(() => {
        playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useIsRandomizedMode());

      rerender();
      expect(result.current).toBe(false);

      // Switch to randomized mode
      act(() => {
        playthroughActions.setGameMode('randomized');
      });

      rerender();
      expect(result.current).toBe(true);

      // Switch to remix mode
      act(() => {
        playthroughActions.setGameMode('remix');
      });

      rerender();
      expect(result.current).toBe(false);

      // Switch back to randomized mode
      act(() => {
        playthroughActions.setGameMode('randomized');
      });

      rerender();
      expect(result.current).toBe(true);
    });
  });

  describe('Game Mode Actions', () => {
    let playthroughId: string;

    beforeEach(() => {
      act(() => {
        playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });
    });

    describe('setGameMode', () => {
      it('should set classic mode', () => {
        act(() => {
          playthroughActions.setGameMode('classic');
        });

        const activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('classic');
      });

      it('should set remix mode', () => {
        act(() => {
          playthroughActions.setGameMode('remix');
        });

        const activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('remix');
      });

      it('should set randomized mode', () => {
        act(() => {
          playthroughActions.setGameMode('randomized');
        });

        const activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('randomized');
      });

      it('should update timestamp when setting game mode', () => {
        const activePlaythrough = playthroughActions.getActivePlaythrough();
        const originalTimestamp = activePlaythrough?.updatedAt;

        // Wait a bit to ensure timestamp difference
        act(() => {
          playthroughActions.setGameMode('randomized');
        });

        const updatedPlaythrough = playthroughActions.getActivePlaythrough();
        expect(updatedPlaythrough?.updatedAt).toBeGreaterThan(
          originalTimestamp || 0
        );
      });
    });

    describe('cycleGameMode', () => {
      it('should cycle from classic to remix to randomized and back to classic', () => {
        // Start with classic mode
        let activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('classic');

        // Cycle to remix
        act(() => {
          playthroughActions.cycleGameMode();
        });

        activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('remix');

        // Cycle to randomized
        act(() => {
          playthroughActions.cycleGameMode();
        });

        activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('randomized');

        // Cycle back to classic
        act(() => {
          playthroughActions.cycleGameMode();
        });

        activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('classic');
      });

      it('should work from any starting mode', () => {
        // Start with randomized mode
        act(() => {
          playthroughActions.setGameMode('randomized');
        });

        let activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('randomized');

        // Cycle to classic
        act(() => {
          playthroughActions.cycleGameMode();
        });

        activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('classic');

        // Cycle to remix
        act(() => {
          playthroughActions.cycleGameMode();
        });

        activePlaythrough = playthroughActions.getActivePlaythrough();
        expect(activePlaythrough?.gameMode).toBe('remix');
      });
    });

    describe('getGameMode', () => {
      it('should return classic mode by default', () => {
        const gameMode = playthroughActions.getGameMode();
        expect(gameMode).toBe('classic');
      });

      it('should return the current game mode', () => {
        // Test classic mode
        expect(playthroughActions.getGameMode()).toBe('classic');

        // Test remix mode
        act(() => {
          playthroughActions.setGameMode('remix');
        });
        expect(playthroughActions.getGameMode()).toBe('remix');

        // Test randomized mode
        act(() => {
          playthroughActions.setGameMode('randomized');
        });
        expect(playthroughActions.getGameMode()).toBe('randomized');
      });
    });

    describe('isRandomizedModeEnabled', () => {
      it('should return false for classic mode', () => {
        act(() => {
          playthroughActions.setGameMode('classic');
        });
        expect(playthroughActions.isRandomizedModeEnabled()).toBe(false);
      });

      it('should return false for remix mode', () => {
        act(() => {
          playthroughActions.setGameMode('remix');
        });
        expect(playthroughActions.isRandomizedModeEnabled()).toBe(false);
      });

      it('should return true for randomized mode', () => {
        act(() => {
          playthroughActions.setGameMode('randomized');
        });
        expect(playthroughActions.isRandomizedModeEnabled()).toBe(true);
      });
    });
  });

  describe('Playthrough Creation with Game Modes', () => {
    it('should create playthrough with classic mode by default', () => {
      const playthroughId = playthroughActions.createPlaythrough('Default Run');
      const playthrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      expect(playthrough?.gameMode).toBe('classic');
    });

    it('should create playthrough with specified classic mode', () => {
      const playthroughId = playthroughActions.createPlaythrough(
        'Classic Run',
        'classic'
      );
      const playthrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      expect(playthrough?.gameMode).toBe('classic');
    });

    it('should create playthrough with remix mode', () => {
      const playthroughId = playthroughActions.createPlaythrough(
        'Remix Run',
        'remix'
      );
      const playthrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      expect(playthrough?.gameMode).toBe('remix');
    });

    it('should create playthrough with randomized mode', () => {
      const playthroughId = playthroughActions.createPlaythrough(
        'Randomized Run',
        'randomized'
      );
      const playthrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      expect(playthrough?.gameMode).toBe('randomized');
    });

    it('should set correct timestamps for new playthroughs', () => {
      const beforeCreate = Date.now();
      const playthroughId = playthroughActions.createPlaythrough(
        'Timestamped Run',
        'randomized'
      );
      const afterCreate = Date.now();

      const playthrough = playthroughsStore.playthroughs.find(
        p => p.id === playthroughId
      );
      expect(playthrough?.createdAt).toBeGreaterThanOrEqual(beforeCreate);
      expect(playthrough?.createdAt).toBeLessThanOrEqual(afterCreate);
      expect(playthrough?.updatedAt).toBe(playthrough?.createdAt);
    });
  });

  describe('usePlaythroughById', () => {
    it('should return null for undefined ID', () => {
      const { result } = renderHook(() => usePlaythroughById(undefined));
      expect(result.current).toBeNull();
    });

    it('should return null for non-existent playthrough ID', () => {
      const { result } = renderHook(() =>
        usePlaythroughById('non-existent-id')
      );
      expect(result.current).toBeNull();
    });

    it('should return the correct playthrough by ID', () => {
      let playthroughId1: string;
      let playthroughId2: string;

      act(() => {
        playthroughId1 = playthroughActions.createPlaythrough(
          'First Run',
          'classic'
        );
        playthroughId2 = playthroughActions.createPlaythrough(
          'Second Run',
          'remix'
        );
      });

      const { result: result1 } = renderHook(() =>
        usePlaythroughById(playthroughId1)
      );
      const { result: result2 } = renderHook(() =>
        usePlaythroughById(playthroughId2)
      );

      expect(result1.current?.name).toBe('First Run');
      expect(result1.current?.gameMode).toBe('classic');

      expect(result2.current?.name).toBe('Second Run');
      expect(result2.current?.gameMode).toBe('remix');
    });

    it('should update when the specific playthrough is modified', () => {
      let playthroughId: string;

      act(() => {
        playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
      });

      const { result, rerender } = renderHook(() =>
        usePlaythroughById(playthroughId!)
      );

      rerender();
      expect(result.current?.name).toBe('Test Run');

      // Update the playthrough name
      act(() => {
        playthroughActions.updatePlaythroughName(playthroughId!, 'Updated Run');
      });

      rerender();
      // Verify the playthrough was updated
      expect(result.current?.name).toBe('Updated Run');
      // The key test is that the name changed, indicating reactivity works
      expect(result.current?.updatedAt).toBeGreaterThan(0);
    });
  });

  describe('useIsLoading', () => {
    it('should return the loading state from the store', () => {
      const { result, rerender } = renderHook(() => useIsLoading());

      // Initially false (set in beforeEach)
      expect(result.current).toBe(false);

      // Set loading to true
      act(() => {
        playthroughsStore.isLoading = true;
      });

      rerender();
      expect(result.current).toBe(true);

      // Set loading back to false
      act(() => {
        playthroughsStore.isLoading = false;
      });

      rerender();
      expect(result.current).toBe(false);
    });
  });

  describe('useEncounters', () => {
    it('should return empty encounters when no active playthrough exists', () => {
      const { result } = renderHook(() => useEncounters());
      expect(result.current).toEqual({});
    });

    it('should return encounters from the active playthrough', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        await playthroughActions.setActivePlaythrough(playthroughId);

        // Add some encounters
        await playthroughActions.updateEncounter('route-1', pikachu);
        await playthroughActions.updateEncounter('route-2', charmander);
      });

      const { result } = renderHook(() => useEncounters());

      expect(result.current).toBeDefined();
      expect(Object.keys(result.current!)).toHaveLength(2);
      expect(result.current!['route-1']?.head?.name).toBe('Pikachu');
      expect(result.current!['route-2']?.head?.name).toBe('Charmander');
    });

    it('should update when encounters are modified', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const squirtle = createMockPokemon('Squirtle', 7);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        await playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result, rerender } = renderHook(() => useEncounters());

      // Initially empty
      expect(result.current).toBeDefined();
      expect(Object.keys(result.current!)).toHaveLength(0);

      // Add an encounter
      await act(async () => {
        await playthroughActions.updateEncounter('route-1', pikachu);
      });

      rerender();
      expect(Object.keys(result.current!)).toHaveLength(1);
      expect(result.current!['route-1']?.head?.name).toBe('Pikachu');

      // Update the encounter
      await act(async () => {
        await playthroughActions.updateEncounter('route-1', squirtle);
      });

      rerender();
      expect(result.current!['route-1']?.head?.name).toBe('Squirtle');

      // Remove the encounter
      act(() => {
        playthroughActions.resetEncounter('route-1');
      });

      rerender();
      expect(Object.keys(result.current!)).toHaveLength(0);
    });

    it('should handle fusion encounters correctly', async () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      const charmander = createMockPokemon('Charmander', 4);

      await act(async () => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        await playthroughActions.setActivePlaythrough(playthroughId);

        // Create a fusion encounter
        await playthroughActions.createFusion('route-1', pikachu, charmander);
      });

      const { result } = renderHook(() => useEncounters());

      expect(result.current).toBeDefined();
      expect(result.current!['route-1']?.isFusion).toBe(true);
      expect(result.current!['route-1']?.head?.name).toBe('Pikachu');
      expect(result.current!['route-1']?.body?.name).toBe('Charmander');
    });
  });

  // TODO: Add comprehensive tests for useEncounter hook once import issues are resolved
  // The useEncounter hook provides granular reactivity for individual encounters
  // and should be tested for:
  // - Returning null for non-existent locations
  // - Returning encounter data for existing locations
  // - Updating when specific encounters change
  // - Not updating when other encounters change
  // - Handling fusion encounters correctly
  // - Updating when artwork variants change
  // - Handling individual encounter timestamps

  describe('Hook performance and memoization', () => {
    it('should not cause unnecessary re-renders when unrelated data changes', () => {
      let renderCount = 0;

      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
      });

      const { result } = renderHook(() => {
        renderCount++;
        return useIsRemixMode();
      });

      const initialRenderCount = renderCount;
      const initialValue = result.current;

      // Change unrelated store property
      act(() => {
        playthroughsStore.isLoading = !playthroughsStore.isLoading;
      });

      // Should not cause additional renders since remix mode didn't change
      expect(renderCount).toBe(initialRenderCount);
      expect(result.current).toBe(initialValue);
    });

    it('should properly memoize encounters when only metadata changes', () => {
      const pikachu = createMockPokemon('Pikachu', 25);
      let renderCount = 0;

      act(() => {
        const playthroughId = playthroughActions.createPlaythrough(
          'Test Run',
          'classic'
        );
        playthroughActions.setActivePlaythrough(playthroughId);
        playthroughActions.updateEncounter('route-1', pikachu);
      });

      const { result } = renderHook(() => {
        renderCount++;
        return useEncounters();
      });

      const initialRenderCount = renderCount;
      const initialEncounters = result.current;

      // Change loading state (unrelated to encounters)
      act(() => {
        playthroughsStore.isLoading = true;
      });

      // Encounters should remain the same reference due to memoization
      expect(result.current).toBe(initialEncounters);
    });
  });
});

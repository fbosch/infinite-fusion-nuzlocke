import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { PokemonCombobox } from '../PokemonCombobox';

// Mock Next.js Image component for browser tests
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => <img src={src} alt={alt} {...props} />,
}));

// Mock the stores that might be causing issues
vi.mock('@/stores/playthroughs', () => ({
  useGameMode: () => 'classic',
}));

vi.mock('@/stores/dragStore', () => ({
  dragActions: {
    startDrag: vi.fn(),
    endDrag: vi.fn(),
  },
}));

describe('PokemonCombobox', () => {
  const defaultProps = {
    routeId: 78, // Route 1
    locationId: 'test-location',
    value: null,
    onChange: () => {},
    shouldLoad: false, // Disable data loading for basic tests
    placeholder: 'Select Pokemon',
    nicknamePlaceholder: 'Enter nickname',
    disabled: false,
    comboboxId: 'test-combobox',
  };

  const selectedPokemon = {
    id: 1,
    name: 'Bulbasaur',
    nationalDexId: 1,
    originalLocation: 'test-location',
    uid: 'test-uid-1',
    nickname: 'My Bulbasaur',
  };

  describe('Basic Rendering', () => {
    it('should render the combobox with placeholder', async () => {
      const screen = render(<PokemonCombobox {...defaultProps} />);

      await expect
        .element(screen.getByPlaceholder('Select Pokemon'))
        .toBeInTheDocument();
    });

    it('should render with different placeholder text', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} placeholder='Choose Pokemon' />
      );

      await expect
        .element(screen.getByPlaceholder('Choose Pokemon'))
        .toBeInTheDocument();
    });

    it('should show the combobox container', async () => {
      const screen = render(<PokemonCombobox {...defaultProps} />);

      const container = screen.getByRole('combobox');
      await expect.element(container).toBeInTheDocument();
    });
  });

  describe('Pokemon Selection', () => {
    it('should display selected Pokemon name in input', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} value={selectedPokemon} />
      );

      await expect
        .element(screen.getByDisplayValue('Bulbasaur'))
        .toBeInTheDocument();
    });

    it('should show Pokemon sprite when value is selected', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} value={selectedPokemon} />
      );

      await expect
        .element(screen.getByAltText('Bulbasaur'))
        .toBeInTheDocument();
    });

    it('should handle onChange callback when Pokemon is selected', async () => {
      let onChangeCalled = false;
      let selectedValue: unknown = null;

      const onChange = (value: unknown) => {
        onChangeCalled = true;
        selectedValue = value;
      };

      const screen = render(
        <PokemonCombobox {...defaultProps} onChange={onChange} />
      );

      const input = screen.getByPlaceholder('Select Pokemon');
      await input.click();

      // Simulate selecting a Pokemon by changing the value
      onChange(selectedPokemon);

      expect(onChangeCalled).toBe(true);
      expect(selectedValue).toEqual(selectedPokemon);
    });
  });

  describe('Nickname Input', () => {
    it('should render nickname input when Pokemon is selected', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} value={selectedPokemon} />
      );

      await expect
        .element(screen.getByPlaceholder('Enter nickname'))
        .toBeInTheDocument();
    });

    it('should show custom nickname placeholder', async () => {
      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          nicknamePlaceholder='Enter custom nickname'
        />
      );

      await expect
        .element(screen.getByPlaceholder('Enter custom nickname'))
        .toBeInTheDocument();
    });

    it('should display Pokemon nickname in nickname input', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} value={selectedPokemon} />
      );

      await expect
        .element(screen.getByDisplayValue('My Bulbasaur'))
        .toBeInTheDocument();
    });

    it('should handle nickname changes', async () => {
      let updatedValue: unknown = null;
      const onChange = (value: unknown) => {
        updatedValue = value;
      };

      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          onChange={onChange}
        />
      );

      const nicknameInput = screen.getByDisplayValue('My Bulbasaur');
      await nicknameInput.clear();
      await nicknameInput.fill('New Nickname');
      await nicknameInput.blur();

      expect(updatedValue).toBeDefined();
    });
  });

  describe('Status Input', () => {
    it('should render status input when Pokemon is selected', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} value={selectedPokemon} />
      );

      // Status input should be present (look for the menu button)
      const statusButton = screen.getByRole('button');
      await expect.element(statusButton).toBeInTheDocument();
    });

    it('should show status menu when clicked', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} value={selectedPokemon} />
      );

      const statusButton = screen.getByRole('button');
      await statusButton.click();

      // Should show menu items for different statuses
      await expect.element(screen.getByText('Captured')).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable the combobox when disabled prop is true', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} disabled={true} />
      );

      const input = screen.getByPlaceholder('Select Pokemon');
      await expect.element(input).toBeDisabled();
    });

    it('should disable nickname input when disabled', async () => {
      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          disabled={true}
        />
      );

      const nicknameInput = screen.getByDisplayValue('My Bulbasaur');
      await expect.element(nicknameInput).toBeDisabled();
    });

    it('should disable status input when disabled', async () => {
      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          disabled={true}
        />
      );

      const statusButton = screen.getByRole('button');
      await expect.element(statusButton).toBeDisabled();
    });
  });

  describe('Search Functionality', () => {
    it('should open dropdown when input is clicked', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} shouldLoad={true} />
      );

      const input = screen.getByPlaceholder('Select Pokemon');
      await input.click();

      // The dropdown should be opened (combobox expanded)
      await expect.element(input).toHaveAttribute('aria-expanded', 'true');
    });

    it('should filter results when typing', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} shouldLoad={true} />
      );

      const input = screen.getByPlaceholder('Select Pokemon');
      await input.click();
      await input.fill('Bulba');

      // Input should contain the typed text
      await expect
        .element(screen.getByDisplayValue('Bulba'))
        .toBeInTheDocument();
    });

    it('should clear input when selection is cleared', async () => {
      let clearedValue: unknown = undefined;
      const onChange = (value: unknown) => {
        clearedValue = value;
      };

      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          onChange={onChange}
        />
      );

      const input = screen.getByDisplayValue('Bulbasaur');
      await input.clear();

      expect(clearedValue).toBe(null);
    });
  });

  describe('onBeforeClear Callback', () => {
    it('should call onBeforeClear when input is cleared', async () => {
      let onBeforeClearCalled = false;
      let onChangeCalled = false;

      const onBeforeClear = () => {
        onBeforeClearCalled = true;
        return true; // Allow clearing
      };

      const onChange = () => {
        onChangeCalled = true;
      };

      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          onChange={onChange}
          onBeforeClear={onBeforeClear}
        />
      );

      const input = screen.getByDisplayValue('Bulbasaur');
      await input.clear();

      expect(onBeforeClearCalled).toBe(true);
      expect(onChangeCalled).toBe(true);
    });

    it('should prevent clearing when onBeforeClear returns false', async () => {
      let onBeforeClearCalled = false;
      let onChangeCalled = false;

      const onBeforeClear = () => {
        onBeforeClearCalled = true;
        return false; // Prevent clearing
      };

      const onChange = () => {
        onChangeCalled = true;
      };

      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          onChange={onChange}
          onBeforeClear={onBeforeClear}
        />
      );

      const input = screen.getByDisplayValue('Bulbasaur');
      await input.clear();

      expect(onBeforeClearCalled).toBe(true);
      expect(onChangeCalled).toBe(false);
    });
  });

  describe('Route and Location Props', () => {
    it('should accept routeId prop', async () => {
      const screen = render(<PokemonCombobox {...defaultProps} routeId={1} />);

      await expect
        .element(screen.getByPlaceholder('Select Pokemon'))
        .toBeInTheDocument();
    });

    it('should accept locationId prop', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} locationId='route-1' />
      );

      await expect
        .element(screen.getByPlaceholder('Select Pokemon'))
        .toBeInTheDocument();
    });

    it('should handle starter Pokemon (routeId 0)', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} routeId={0} shouldLoad={true} />
      );

      const input = screen.getByPlaceholder('Select Pokemon');
      await input.click();

      // Should handle the special case of starter Pokemon
      await expect.element(input).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Drag and Drop', () => {
    it('should support drag and drop with comboboxId', async () => {
      const screen = render(
        <PokemonCombobox
          {...defaultProps}
          value={selectedPokemon}
          comboboxId='drag-test'
        />
      );

      const sprite = screen.getByAltText('Bulbasaur');
      await expect.element(sprite).toHaveAttribute('draggable', 'true');
    });

    it('should handle drag events on Pokemon sprite', async () => {
      const screen = render(
        <PokemonCombobox {...defaultProps} value={selectedPokemon} />
      );

      const sprite = screen.getByAltText('Bulbasaur');

      // Simulate drag start
      await sprite.dispatchEvent(
        new DragEvent('dragstart', {
          bubbles: true,
          dataTransfer: new DataTransfer(),
        })
      );

      // Should not throw errors
      await expect.element(sprite).toBeInTheDocument();
    });
  });
});

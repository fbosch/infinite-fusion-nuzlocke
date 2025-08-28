import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TeamMemberPickerModal from '../TeamMemberPickerModal';

// Mock the stores and hooks
vi.mock('@/stores/playthroughs', () => ({
  useActivePlaythrough: () => ({
    id: 'test-playthrough',
    name: 'Test Run',
    gameMode: 'classic',
  }),
  playthroughActions: {
    updateEncounter: vi.fn(),
  },
}));

vi.mock('@/stores/playthroughs/hooks', () => ({
  useEncounters: () => ({
    'route-1': {
      head: {
        id: 'pikachu',
        name: 'Pikachu',
        uid: 'pikachu_route1_123',
        nickname: 'Sparky',
        status: 'active',
      },
      body: {
        id: 'charmander',
        name: 'Charmander',
        uid: 'charmander_route1_456',
        nickname: 'Flame',
        status: 'active',
      },
      isFusion: true,
    },
  }),
}));

describe('TeamMemberPickerModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    position: 0,
    existingTeamMember: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show nickname input for head Pokémon selection', () => {
    render(<TeamMemberPickerModal {...defaultProps} />);

    // The nickname input should be visible when any Pokémon is selected
    expect(screen.getByLabelText(/nickname/i)).toBeInTheDocument();
  });

  it('should pre-fill nickname when head Pokémon is selected', async () => {
    render(<TeamMemberPickerModal {...defaultProps} />);

    // Find and click on the head Pokémon slot
    const headSlot = screen.getByText(/head/i);
    fireEvent.click(headSlot);

    // Find and click on Pikachu in the grid
    const pikachuItem = screen.getByText('Pikachu');
    fireEvent.click(pikachuItem);

    // Wait for the nickname to be pre-filled
    await waitFor(() => {
      const nicknameInput = screen.getByDisplayValue('Sparky');
      expect(nicknameInput).toBeInTheDocument();
    });
  });

  it('should pre-fill nickname when body Pokémon is selected', async () => {
    render(<TeamMemberPickerModal {...defaultProps} />);

    // Find and click on the body Pokémon slot
    const bodySlot = screen.getByText(/body/i);
    fireEvent.click(bodySlot);

    // Find and click on Charmander in the grid
    const charmanderItem = screen.getByText('Charmander');
    fireEvent.click(charmanderItem);

    // Wait for the nickname to be pre-filled
    await waitFor(() => {
      const nicknameInput = screen.getByDisplayValue('Flame');
      expect(nicknameInput).toBeInTheDocument();
    });
  });

  it('should show nickname label with Pokémon name', async () => {
    render(<TeamMemberPickerModal {...defaultProps} />);

    // Select head Pokémon
    const headSlot = screen.getByText(/head/i);
    fireEvent.click(headSlot);

    const pikachuItem = screen.getByText('Pikachu');
    fireEvent.click(pikachuItem);

    // Check that the label shows the Pokémon name
    await waitFor(() => {
      expect(
        screen.getByLabelText(/nickname for pikachu/i)
      ).toBeInTheDocument();
    });
  });

  it('should clear nickname when Pokémon is unselected', async () => {
    render(<TeamMemberPickerModal {...defaultProps} />);

    // Select head Pokémon
    const headSlot = screen.getByText(/head/i);
    fireEvent.click(headSlot);

    const pikachuItem = screen.getByText('Pikachu');
    fireEvent.click(pikachuItem);

    // Verify nickname is pre-filled
    await waitFor(() => {
      expect(screen.getByDisplayValue('Sparky')).toBeInTheDocument();
    });

    // Click on Pikachu again to unselect it
    fireEvent.click(pikachuItem);

    // Verify nickname is cleared
    await waitFor(() => {
      const nicknameInput = screen.getByDisplayValue('');
      expect(nicknameInput).toBeInTheDocument();
    });
  });
});

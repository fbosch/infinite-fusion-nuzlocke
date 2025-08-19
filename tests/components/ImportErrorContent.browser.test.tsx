import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImportErrorContent } from '@/components/playthrough/ImportErrorContent';

describe('ImportErrorContent', () => {
  describe('Zod validation errors', () => {
    it('should display validation errors with proper formatting', () => {
      const errorMessage = `Validation failed:

• Invalid option: expected one of "classic"|"remix"|"randomized" at playthrough.gameMode
• Required at playthrough.name`;

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText('The imported file has some issues:')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Invalid value: must be one of: classic, remix, randomized in the gameMode field'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText('This field is required in the name field')
      ).toBeInTheDocument();
    });

    it('should handle complex validation error paths', () => {
      const errorMessage = `Validation failed:

• Invalid type: expected string, received number at playthrough.customLocations.0.name`;

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText(
          'Invalid value: expected string, received number in the name field'
        )
      ).toBeInTheDocument();
    });

    it('should handle single validation error', () => {
      const errorMessage = `Validation failed:

• Required at playthrough.id`;

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText('The imported file has some issues:')
      ).toBeInTheDocument();
      expect(
        screen.getByText('This field is required in the id field')
      ).toBeInTheDocument();
    });
  });

  describe('General import errors', () => {
    it('should display file type errors', () => {
      const errorMessage = 'File must have a .json extension';

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText('File must have a .json extension')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('The imported file has some issues:')
      ).not.toBeInTheDocument();
    });

    it('should display JSON syntax errors', () => {
      const errorMessage = 'Invalid JSON syntax';

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(screen.getByText('Invalid JSON syntax')).toBeInTheDocument();
      expect(
        screen.queryByText('The imported file has some issues:')
      ).not.toBeInTheDocument();
    });

    it('should display generic import errors', () => {
      const errorMessage = 'Import failed. Please try again.';

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText('Import failed. Please try again.')
      ).toBeInTheDocument();
      expect(
        screen.queryByText('The imported file has some issues:')
      ).not.toBeInTheDocument();
    });
  });

  describe('Error message formatting', () => {
    it('should remove bullet points from validation errors', () => {
      const errorMessage = `Validation failed:

• Invalid option: expected one of "classic"|"remix"|"randomized" at playthrough.gameMode`;

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText(
          'Invalid value: must be one of: classic, remix, randomized in the gameMode field'
        )
      ).toBeInTheDocument();
      expect(screen.queryByText('• Invalid option:')).not.toBeInTheDocument();
    });

    it('should format field references clearly', () => {
      const errorMessage = `Validation failed:

• Required at playthrough.encounters.route1.head`;

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText('This field is required in the head field')
      ).toBeInTheDocument();
    });

    it('should handle enum errors clearly', () => {
      const errorMessage = `Validation failed:

• Invalid option: expected one of "classic"|"remix"|"randomized" at playthrough.gameMode`;

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText(
          'Invalid value: must be one of: classic, remix, randomized in the gameMode field'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty error message', () => {
      render(<ImportErrorContent errorMessage='' />);

      expect(
        screen.queryByText('The imported file has some issues:')
      ).not.toBeInTheDocument();
    });

    it('should handle error message without validation section', () => {
      const errorMessage = 'Some random error message';

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(screen.getByText('Some random error message')).toBeInTheDocument();
      expect(
        screen.queryByText('The imported file has some issues:')
      ).not.toBeInTheDocument();
    });

    it('should handle error message with only "Validation failed:" header', () => {
      const errorMessage = 'Validation failed:';

      render(<ImportErrorContent errorMessage={errorMessage} />);

      expect(
        screen.getByText('The imported file has some issues:')
      ).toBeInTheDocument();
      expect(screen.queryByText('•')).not.toBeInTheDocument();
    });
  });
});

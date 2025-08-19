import React from 'react';

interface ImportErrorContentProps {
  errorMessage: string;
}

export function ImportErrorContent({ errorMessage }: ImportErrorContentProps) {
  // Check if this is a Zod validation error or a general import error
  if (errorMessage.includes('Validation failed:')) {
    // Parse the error message to extract validation errors
    const lines = errorMessage.split('\n');
    const validationErrors: string[] = [];
    let currentSection: 'validation' | null = null;

    for (const line of lines) {
      if (line.includes('Validation failed:')) {
        currentSection = 'validation';
        continue;
      }
      if (line.includes('Expected format:')) {
        break; // Stop parsing when we hit the format guide
      }

      if (
        currentSection === 'validation' &&
        line.trim() &&
        !line.includes('Expected format:')
      ) {
        validationErrors.push(line.trim());
      }
    }

    // Function to make error messages more user-friendly
    const formatErrorMessage = (error: string): string => {
      // Remove Zod's technical formatting
      const formatted = error
        .replace(/^•\s*/, '') // Remove bullet point
        .replace(/at\s+.*\.([^.]+)$/, 'in the $1 field') // Extract final field name after last dot
        .replace(/at\s+([^.]+)$/, 'in the $1 field') // Handle single-level paths
        .replace(/expected\s+one\s+of\s+/, 'must be one of: ') // Make enum errors clearer
        .replace(/Invalid\s+option:\s*/, 'Invalid value: ') // Simplify invalid option message
        .replace(/Invalid\s+type:\s*/, 'Invalid value: ') // Simplify invalid type message
        .replace(/Required/, 'This field is required') // Make required field errors clearer
        .replace(/"([^"]+)"\|"([^"]+)"\|"([^"]+)"/, '$1, $2, $3'); // Convert pipe-separated to comma-separated

      return formatted;
    };

    return (
      <div className='space-y-4'>
        <div>
          <h3 className='font-medium text-red-600 dark:text-red-400 mb-3'>
            The imported file has some issues:
          </h3>
          {validationErrors.length > 0 && (
            <div className='space-y-3'>
              {validationErrors.map((error, index) => (
                <div
                  key={index}
                  className='p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'
                >
                  <p className='text-sm text-gray-800 dark:text-gray-200 leading-relaxed'>
                    {formatErrorMessage(error)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Handle general import errors (file type, JSON syntax, etc.)
  return (
    <div className='p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800'>
      <p className='text-sm text-gray-800 dark:text-gray-200 leading-relaxed'>
        {errorMessage}
      </p>
    </div>
  );
}

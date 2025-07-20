'use client';

import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';
import clsx from 'clsx';
import { type PokemonOption } from '@/loaders/pokemon';

interface PokemonNicknameInputProps {
  value: PokemonOption | null | undefined;
  onChange: (value: PokemonOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  dragPreview?: PokemonOption | null;
}

export const PokemonNicknameInput = ({
  value,
  onChange,
  placeholder = 'Enter nickname',
  disabled = false,
  dragPreview,
}: PokemonNicknameInputProps) => {
  // Local nickname state for smooth typing
  const [localNickname, setLocalNickname] = useState(value?.nickname || '');
  const [hasLocalChanges, setHasLocalChanges] = useState(false);

  // Sync local nickname when value changes from external source
  useEffect(() => {
    if (!hasLocalChanges && value?.nickname !== localNickname) {
      setLocalNickname(value?.nickname || '');
    }
  }, [value?.nickname, hasLocalChanges, localNickname]);

  // Commit changes to parent
  const commitChanges = useCallback(() => {
    if (hasLocalChanges && value) {
      const updatedPokemon: PokemonOption = {
        ...value,
        nickname: localNickname,
      };
      onChange(updatedPokemon);
      setHasLocalChanges(false);
    }
  }, [hasLocalChanges, value, localNickname, onChange]);

  // Handle nickname input change (local only)
  const handleNicknameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newNickname = event.target.value;
      setLocalNickname(newNickname);
      setHasLocalChanges(true);
    },
    []
  );

  // Handle blur - commit changes
  const handleBlur = useCallback(() => {
    commitChanges();
  }, [commitChanges]);

  // Handle Enter key - commit changes
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        commitChanges();
        event.currentTarget.blur();
      } else if (event.key === 'Escape') {
        // Revert changes
        setLocalNickname(value?.nickname || '');
        setHasLocalChanges(false);
        event.currentTarget.blur();
      }
    },
    [commitChanges, value?.nickname]
  );

  return (
    <input
      type='text'
      value={dragPreview ? dragPreview.nickname || '' : localNickname}
      onChange={handleNicknameChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={clsx(
        'rounded-bl-md border-t-0 border-r-0 rounded-t-none relative',
        'flex-1 px-3 py-3.5 text-sm border bg-white text-gray-900 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed',
        'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400',
        'placeholder-gray-500 dark:placeholder-gray-400',
        dragPreview && 'opacity-60 pointer-none',
        hasLocalChanges && 'ring-1 ring-orange-300 border-orange-300 dark:ring-orange-500 dark:border-orange-500' // Visual indicator for unsaved changes
      )}
      maxLength={12}
      disabled={!value || disabled}
      spellCheck={false}
      autoComplete='off'
      title={hasLocalChanges ? 'Press Enter to save or Escape to cancel' : undefined}
    />
  );
};

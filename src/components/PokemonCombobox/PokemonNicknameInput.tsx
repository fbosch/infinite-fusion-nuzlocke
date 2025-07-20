'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
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

  // Sync local nickname when value changes (but not during typing)
  useEffect(() => {
    if (value?.nickname !== localNickname) {
      setLocalNickname(value?.nickname || '');
    }
  }, [value?.nickname]);

  // Handle nickname input change with local state
  const handleNicknameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newNickname = event.target.value;
      // Update local state immediately for responsive typing
      setLocalNickname(newNickname);

      if (value) {
        // Use startTransition to defer the state update
        startTransition(() => {
          const updatedPokemon: PokemonOption = {
            ...value,
            nickname: newNickname,
          };
          onChange(updatedPokemon);
        });
      }
    },
    [value, onChange]
  );

  return (
    <input
      type='text'
      value={dragPreview ? dragPreview.nickname || '' : localNickname}
      onChange={handleNicknameChange}
      placeholder={placeholder}
      className={clsx(
        'rounded-bl-md border-t-0 border-r-0 rounded-t-none relative',
        'flex-1 px-3 py-3.5 text-sm border bg-white text-gray-900 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed',
        'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400',
        'placeholder-gray-500 dark:placeholder-gray-400',
        dragPreview && 'opacity-60 pointer-none'
      )}
      maxLength={12}
      disabled={!value || disabled}
      spellCheck={false}
      autoComplete='off'
    />
  );
};

'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
  useRef,
} from 'react';
import clsx from 'clsx';
import { type PokemonOptionType } from '@/loaders/pokemon';

interface PokemonNicknameInputProps {
  value: PokemonOptionType | null | undefined;
  onChange: (value: PokemonOptionType | null) => void;
  placeholder?: string;
  disabled?: boolean;
  dragPreview?: PokemonOptionType | null;
}

export const PokemonNicknameInput = ({
  value,
  onChange,
  placeholder = 'Enter nickname',
  disabled = false,
  dragPreview,
}: PokemonNicknameInputProps) => {
  // Local state for immediate UI feedback
  const [localNickname, setLocalNickname] = useState(value?.nickname || '');
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Keep track of the Pokemon ID to detect when a different Pokemon is selected
  const currentPokemonId = value?.id;
  const lastSyncedPokemonId = useRef(currentPokemonId);

  // Simple effect to sync when Pokemon changes or external nickname updates
  useEffect(() => {
    if (!value) {
      setLocalNickname('');
      lastSyncedPokemonId.current = undefined;
      setIsUserTyping(false);
      return;
    }

    // If this is a different Pokemon, always sync
    if (currentPokemonId !== lastSyncedPokemonId.current) {
      setLocalNickname(value.nickname || '');
      lastSyncedPokemonId.current = currentPokemonId;
      setIsUserTyping(false);
      return;
    }

    // If it's the same Pokemon but nickname changed externally and user isn't typing, sync
    if (value.nickname !== localNickname && !isUserTyping) {
      setLocalNickname(value.nickname || '');
    }
  }, [value, value?.nickname, currentPokemonId, localNickname, isUserTyping]);

  // Helper function to commit changes to parent
  const commitChanges = useCallback(() => {
    if (value && localNickname !== value.nickname) {
      startTransition(() => {
        const updatedPokemon: PokemonOptionType = {
          ...value,
          nickname: localNickname,
        };
        onChange(updatedPokemon);
      });
    }
  }, [value, localNickname, onChange]);

  // Handle nickname input change (local state only for immediate feedback)
  const handleNicknameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setIsUserTyping(true);
      setLocalNickname(event.target.value);
    },
    []
  );

  // Handle Enter key - commit changes immediately and blur
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        setIsUserTyping(false);
        commitChanges();
        event.currentTarget.blur();
      } else if (event.key === 'Escape') {
        // Revert to original value
        setIsUserTyping(false);
        setLocalNickname(value?.nickname || '');
        event.currentTarget.blur();
      }
    },
    [commitChanges, value]
  );

  // Handle blur - commit changes immediately
  const handleBlur = useCallback(() => {
    setIsUserTyping(false);
    commitChanges();
  }, [commitChanges]);

  const displayValue = dragPreview ? dragPreview.nickname || '' : localNickname;

  return (
    <input
      type='text'
      value={displayValue}
      onChange={handleNicknameChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={clsx(
        'rounded-bl-md border-t-0 border-r-0 rounded-t-none relative',
        'flex-1 px-3 py-3.5 text-sm border bg-white text-gray-900 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed',
        'border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400',
        'placeholder-gray-500 dark:placeholder-gray-400',
        dragPreview && 'opacity-60 '
      )}
      maxLength={12}
      disabled={!value || disabled}
      spellCheck={false}
      autoComplete='off'
    />
  );
};

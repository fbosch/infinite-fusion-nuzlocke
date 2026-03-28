"use client";

import clsx from "clsx";
import type React from "react";
import { startTransition, useCallback, useRef } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";

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
  placeholder = "Enter nickname",
  disabled = false,
  dragPreview,
}: PokemonNicknameInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputKey = `${value?.id ?? "none"}:${value?.nickname ?? ""}`;

  // Helper function to commit changes to parent
  const commitChanges = useCallback(() => {
    const nextNickname = inputRef.current?.value ?? "";

    if (value && nextNickname !== value.nickname) {
      startTransition(() => {
        const updatedPokemon: PokemonOptionType = {
          ...value,
          nickname: nextNickname,
        };
        onChange(updatedPokemon);
      });
    }
  }, [value, onChange]);

  // Handle Enter key - commit changes immediately and blur
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        commitChanges();
        event.currentTarget.blur();
      } else if (event.key === "Escape") {
        event.currentTarget.value = value?.nickname || "";
        event.currentTarget.blur();
      }
    },
    [commitChanges, value],
  );

  // Handle blur - commit changes immediately
  const handleBlur = useCallback(() => {
    commitChanges();
  }, [commitChanges]);

  if (dragPreview) {
    return (
      <input
        type="text"
        value={dragPreview.nickname || ""}
        placeholder={placeholder}
        className={clsx(
          "rounded-bl-md border-t-0 border-r-0 rounded-t-none relative",
          "flex-1 px-3 py-3.5 text-sm border bg-white text-gray-900 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed",
          "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400",
          "placeholder-gray-500 dark:placeholder-gray-400",
          "opacity-60",
        )}
        maxLength={12}
        disabled
        readOnly
        spellCheck={false}
        autoComplete="off"
      />
    );
  }

  return (
    <input
      key={inputKey}
      type="text"
      defaultValue={value?.nickname || ""}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      ref={inputRef}
      className={clsx(
        "rounded-bl-md border-t-0 border-r-0 rounded-t-none relative",
        "flex-1 px-3 py-3.5 text-sm border bg-white text-gray-900 outline-none focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-blue-500 focus-visible:border-blue-500 disabled:cursor-not-allowed",
        "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400",
        "placeholder-gray-500 dark:placeholder-gray-400",
      )}
      maxLength={12}
      disabled={!value || disabled}
      spellCheck={false}
      autoComplete="off"
    />
  );
};

"use client";

import clsx from "clsx";
import type React from "react";
import { startTransition, useRef } from "react";
import type { PokemonOptionType } from "@/loaders/pokemon";

interface PokemonNicknameInputProps {
  disabled?: boolean;
  dragPreview?: PokemonOptionType | null;
  onChange: (value: PokemonOptionType | null) => void;
  placeholder?: string;
  value: PokemonOptionType | null | undefined;
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
  const commitChanges = () => {
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
  };

  // Handle Enter key - commit changes immediately and blur
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      commitChanges();
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.currentTarget.value = value?.nickname || "";
      event.currentTarget.blur();
    }
  };

  // Handle blur - commit changes immediately
  const handleBlur = () => {
    commitChanges();
  };

  if (dragPreview) {
    return (
      <input
        aria-label="Pokemon nickname"
        autoComplete="off"
        className={clsx(
          "relative rounded-t-none rounded-bl-md border-t-0 border-r-0",
          "flex-1 border bg-white px-3 py-3.5 text-gray-900 text-sm outline-none focus:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-inset disabled:cursor-not-allowed",
          "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400",
          "placeholder-gray-500 dark:placeholder-gray-400",
          "opacity-60",
        )}
        disabled
        maxLength={12}
        placeholder={placeholder}
        readOnly
        spellCheck={false}
        type="text"
        value={dragPreview.nickname || ""}
      />
    );
  }

  return (
    <input
      aria-label="Pokemon nickname"
      autoComplete="off"
      className={clsx(
        "relative rounded-t-none rounded-bl-md border-t-0 border-r-0",
        "flex-1 border bg-white px-3 py-3.5 text-gray-900 text-sm outline-none focus:outline-none focus-visible:border-blue-500 focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-inset disabled:cursor-not-allowed",
        "border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus-visible:ring-blue-400",
        "placeholder-gray-500 dark:placeholder-gray-400",
      )}
      defaultValue={value?.nickname || ""}
      disabled={!value || disabled}
      key={inputKey}
      maxLength={12}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      ref={inputRef}
      spellCheck={false}
      type="text"
    />
  );
};

"use client";

import { Search } from "lucide-react";

interface TeamMemberSearchBarProps {
  onSearchChange: (query: string) => void;
  searchQuery: string;
}

export function TeamMemberSearchBar({
  searchQuery,
  onSearchChange,
}: TeamMemberSearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
      <label className="sr-only" htmlFor="team-member-search">
        Search Pokemon
      </label>
      <input
        className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 text-gray-900 placeholder-gray-500 transition-colors duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
        id="team-member-search"
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search Pokémon..."
        type="text"
        value={searchQuery}
      />
    </div>
  );
}

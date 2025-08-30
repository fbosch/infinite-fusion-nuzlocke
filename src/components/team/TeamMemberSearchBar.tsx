'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface TeamMemberSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function TeamMemberSearchBar({
  searchQuery,
  onSearchChange,
}: TeamMemberSearchBarProps) {
  return (
    <div className='relative'>
      <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
      <input
        type='text'
        placeholder='Search Pokémon...'
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        className='w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200'
      />
    </div>
  );
}

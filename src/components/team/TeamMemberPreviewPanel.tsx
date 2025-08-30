'use client';

import React from 'react';
import PokemonSummaryCard from '@/components/PokemonSummaryCard';
import { TeamMemberActions } from './TeamMemberActions';
import { useTeamMemberSelection } from './TeamMemberSelectionContext';

export function TeamMemberPreviewPanel() {
  const { state, actions } = useTeamMemberSelection();
  const {
    selectedHead,
    selectedBody,
    nickname,
    previewNickname,
    canUpdateTeam,
    hasSelection,
  } = state;
  const {
    setNickname,
    setPreviewNickname,
    handleUpdateTeamMember,
    handleClearTeamMember,
  } = actions;
  const selectedPokemonName =
    selectedHead?.pokemon?.name || selectedBody?.pokemon?.name;

  return (
    <div className='w-full lg:w-72 flex flex-col justify-between'>
      <div className='flex-1 flex items-center justify-center min-h-0 py-4'>
        <PokemonSummaryCard
          headPokemon={selectedHead?.pokemon || null}
          bodyPokemon={selectedBody?.pokemon || null}
          isFusion={Boolean(selectedHead?.pokemon && selectedBody?.pokemon)}
          shouldLoad={true}
          nickname={previewNickname || undefined}
          showStatusActions={false}
        />
      </div>

      <div className='space-y-4 mt-auto'>
        {/* Nickname Input */}
        {(selectedHead?.pokemon || selectedBody?.pokemon) && (
          <div className='space-y-2'>
            <label
              htmlFor='nickname'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300'
            >
              Nickname for {selectedPokemonName}
            </label>
            <input
              id='nickname'
              type='text'
              placeholder='Enter nickname...'
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              onBlur={() => setPreviewNickname(nickname)}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-200'
              maxLength={12}
            />
          </div>
        )}

        <TeamMemberActions
          canUpdateTeam={canUpdateTeam}
          hasSelection={hasSelection}
          onUpdate={handleUpdateTeamMember}
          onClear={handleClearTeamMember}
        />
      </div>
    </div>
  );
}

"use client";

import { useCallback } from "react";
import PokemonSummaryCard from "@/components/PokemonSummaryCard";
import { TypePills } from "@/components/TypePills";
import { useFusionTypesFromPokemon } from "@/hooks/useFusionTypes";
import { TeamMemberActions } from "./team-member-actions";
import { useTeamMemberSelection } from "./team-member-selection-context";

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

  // Get fusion types using the existing hook
  const { primary, secondary } = useFusionTypesFromPokemon(
    selectedHead?.pokemon || null,
    selectedBody?.pokemon || null,
    Boolean(selectedHead?.pokemon && selectedBody?.pokemon),
  );
  const {
    setNickname,
    setPreviewNickname,
    handleUpdateTeamMember,
    handleClearTeamMember,
  } = actions;
  const hasType = Boolean(primary || secondary);
  const hasSelectedPokemon = Boolean(
    selectedHead?.pokemon || selectedBody?.pokemon,
  );

  const handleNicknameBlur = useCallback(
    () => setPreviewNickname(nickname),
    [nickname, setPreviewNickname],
  );

  const handleNicknameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) =>
      setNickname(event.target.value),
    [setNickname],
  );

  return (
    <div className="flex w-full flex-col justify-between lg:w-72">
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        <div className="relative flex flex-col items-center space-y-8">
          {/* Type indicators above the fusion sprite */}
          {hasType ? (
            <div className="flex justify-center">
              <TypePills
                primary={primary}
                secondary={secondary}
                showTooltip={true}
                size="md"
              />
            </div>
          ) : null}

          <div className="relative">
            <PokemonSummaryCard
              bodyPokemon={selectedBody?.pokemon || null}
              headPokemon={selectedHead?.pokemon || null}
              isFusion={Boolean(selectedHead?.pokemon && selectedBody?.pokemon)}
              isTeamMember={true}
              nickname={previewNickname || undefined}
              shouldLoad={true}
              showStatusActions={false}
            />
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-4">
        {/* Nickname Input */}
        {hasSelectedPokemon ? (
          <div className="space-y-2">
            <label
              className="block font-medium text-gray-700 text-sm dark:text-gray-300"
              htmlFor="nickname"
            >
              Nickname
            </label>
            <input
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 transition-colors duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
              id="nickname"
              maxLength={12}
              onBlur={handleNicknameBlur}
              onChange={handleNicknameChange}
              placeholder="Enter nickname..."
              type="text"
              value={nickname}
            />
          </div>
        ) : null}

        <TeamMemberActions
          canUpdateTeam={canUpdateTeam}
          hasSelection={hasSelection}
          onClear={handleClearTeamMember}
          onUpdate={handleUpdateTeamMember}
        />
      </div>
    </div>
  );
}

"use client";

import { type ChangeEvent, type ComponentProps, useCallback } from "react";
import PokemonSummaryCard from "@/components/PokemonSummaryCard";
import { TypePills } from "@/components/type-pills";
import { useFusionTypesFromPokemon } from "@/hooks/use-fusion-types";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { TeamMemberActions } from "./team-member-actions";
import { useTeamMemberSelection } from "./team-member-selection-context";

type FusionTypeProps = Pick<
  ComponentProps<typeof TypePills>,
  "primary" | "secondary"
>;

interface TeamMemberPreviewProps extends FusionTypeProps {
  bodyPokemon: PokemonOptionType | null;
  canUpdateTeam: boolean;
  hasSelection: boolean;
  headPokemon: PokemonOptionType | null;
  nickname: string;
  onClear: () => void;
  onNicknameBlur: () => void;
  onNicknameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpdate: () => void;
  previewNickname: string;
}

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

  const headPokemon = selectedHead?.pokemon ?? null;
  const bodyPokemon = selectedBody?.pokemon ?? null;
  const { primary, secondary } = useFusionTypesFromPokemon(
    headPokemon,
    bodyPokemon,
    Boolean(headPokemon && bodyPokemon),
  );
  const {
    setNickname,
    setPreviewNickname,
    handleUpdateTeamMember,
    handleClearTeamMember,
  } = actions;
  const handleNicknameBlur = useCallback(
    () => setPreviewNickname(nickname),
    [nickname, setPreviewNickname],
  );

  const handleNicknameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setNickname(event.target.value),
    [setNickname],
  );

  return (
    <TeamMemberPreview
      bodyPokemon={bodyPokemon}
      canUpdateTeam={canUpdateTeam}
      hasSelection={hasSelection}
      headPokemon={headPokemon}
      nickname={nickname}
      onClear={handleClearTeamMember}
      onNicknameBlur={handleNicknameBlur}
      onNicknameChange={handleNicknameChange}
      onUpdate={handleUpdateTeamMember}
      previewNickname={previewNickname}
      primary={primary}
      secondary={secondary}
    />
  );
}

function TeamMemberPreview({
  bodyPokemon,
  canUpdateTeam,
  hasSelection,
  headPokemon,
  nickname,
  onClear,
  onNicknameBlur,
  onNicknameChange,
  onUpdate,
  previewNickname,
  primary,
  secondary,
}: TeamMemberPreviewProps) {
  const hasType = Boolean(primary || secondary);
  const hasSelectedPokemon = Boolean(headPokemon || bodyPokemon);

  return (
    <div className="flex w-full flex-col justify-between lg:w-72">
      <div className="flex min-h-0 flex-1 items-center justify-center py-4">
        <div className="relative flex flex-col items-center space-y-8">
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
              bodyPokemon={bodyPokemon}
              headPokemon={headPokemon}
              isFusion={Boolean(headPokemon && bodyPokemon)}
              isTeamMember={true}
              nickname={previewNickname || undefined}
              shouldLoad={true}
              showStatusActions={false}
            />
          </div>
        </div>
      </div>

      <div className="mt-auto space-y-4">
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
              onBlur={onNicknameBlur}
              onChange={onNicknameChange}
              placeholder="Enter nickname..."
              type="text"
              value={nickname}
            />
          </div>
        ) : null}

        <TeamMemberActions
          canUpdateTeam={canUpdateTeam}
          hasSelection={hasSelection}
          onClear={onClear}
          onUpdate={onUpdate}
        />
      </div>
    </div>
  );
}

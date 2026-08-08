"use client";

import { ArrowLeftRight } from "lucide-react";
import Image from "next/image";
import { CursorTooltip } from "@/components/cursor-tooltip";
import { DNA_REVERSER_ICON } from "@/constants/items";
import { PokemonGridItem } from "./PokemonGridItem";
import { PokemonSlotSelector } from "./PokemonSlotSelector";
import { TeamMemberSearchBar } from "./TeamMemberSearchBar";
import { useTeamMemberSelection } from "./TeamMemberSelectionContext";
import { flipTeamPokemonSelection } from "./teamMemberSelectionDomain";

export function TeamMemberSelectionPanel() {
  const { state, actions } = useTeamMemberSelection();
  const {
    selectedHead,
    selectedBody,
    activeSlot,
    searchQuery,
    availablePokemon,
  } = state;
  const {
    handleSlotSelect,
    handleRemoveHeadPokemon,
    handleRemoveBodyPokemon,
    handlePokemonSelect,
  } = actions;

  const handleFlipFusion = () => {
    const next = flipTeamPokemonSelection(selectedHead, selectedBody);
    actions.setSelectedHead(next.selectedHead);
    actions.setSelectedBody(next.selectedBody);
    actions.setNickname(next.nickname);
    actions.setPreviewNickname(next.previewNickname);
  };

  // Filter Pokémon based on search query locally (no need to update state)
  const filteredPokemon = (() => {
    if (!searchQuery.trim()) {
      return availablePokemon;
    }

    const query = searchQuery.toLowerCase();
    return availablePokemon.filter(
      ({ pokemon }) =>
        pokemon.name.toLowerCase().includes(query) ||
        pokemon.nickname?.toLowerCase().includes(query),
    );
  })();
  return (
    <div className="flex flex-1 flex-col space-y-5">
      <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
        {/* Head Slot */}
        <PokemonSlotSelector
          isActive={activeSlot === "head"}
          onRemovePokemon={handleRemoveHeadPokemon}
          onSlotSelect={handleSlotSelect}
          selectedPokemon={selectedHead}
          slot="head"
        />

        {/* Inverse Fusion Button - always visible */}
        <div className="flex items-center justify-center">
          <CursorTooltip
            className="origin-top"
            content={
              <div className="flex items-center gap-2">
                <Image
                  alt="DNA Reverser"
                  className="image-rendering-pixelated object-contain object-center"
                  height={24}
                  src={DNA_REVERSER_ICON}
                  width={24}
                />
                <span className="text-sm">Reverse Fusion</span>
              </div>
            }
            delay={300}
            placement="bottom"
          >
            <button
              aria-label="Flip head and body"
              className="group flex size-6 items-center justify-center rounded-md border border-gray-300 bg-white p-1 text-gray-600 transition-colors duration-200 hover:border-blue-600 hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              onClick={handleFlipFusion}
              type="button"
            >
              <ArrowLeftRight className="size-4 hover:text-white" />
            </button>
          </CursorTooltip>
        </div>

        {/* Body Slot */}
        <PokemonSlotSelector
          isActive={activeSlot === "body"}
          onRemovePokemon={handleRemoveBodyPokemon}
          onSlotSelect={handleSlotSelect}
          selectedPokemon={selectedBody}
          slot="body"
        />
      </div>

      <TeamMemberSearchBar
        onSearchChange={actions.setSearchQuery}
        searchQuery={searchQuery}
      />

      <div className="scrollbar-thin h-72 overflow-y-auto pr-1">
        <div
          className="grid h-full grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          style={{ gridTemplateRows: "repeat(4, 1fr)" }}
        >
          {filteredPokemon.length > 0 ? (
            filteredPokemon.map(({ pokemon, locationId }) => {
              const isSelectedHead = selectedHead?.pokemon?.uid === pokemon.uid;
              const isSelectedBody = selectedBody?.pokemon?.uid === pokemon.uid;
              const isSelected = isSelectedHead || isSelectedBody;
              const isActiveSlot = Boolean(activeSlot && !isSelected);

              return (
                <PokemonGridItem
                  isActiveSlot={isActiveSlot}
                  isSelectedBody={isSelectedBody}
                  isSelectedHead={isSelectedHead}
                  key={`${pokemon.uid}-${locationId}`}
                  locationId={locationId}
                  onSelect={handlePokemonSelect}
                  pokemon={pokemon}
                />
              );
            })
          ) : (
            <div className="col-span-full row-span-full flex items-center justify-center py-8 text-center text-gray-500 dark:text-gray-400">
              {searchQuery.trim()
                ? "No Pokémon found matching your search."
                : "No Pokémon available."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
} from "@headlessui/react";
import clsx from "clsx";
import { Box, Boxes, Skull, Users, X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { getLocationsSortedWithCustom } from "@/loaders/locations";
import type { PokemonOptionType } from "@/loaders/pokemon";
import {
  useActivePlaythrough,
  useCustomLocations,
  useEncounters,
} from "@/stores/playthroughs/hooks";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";
import { scrollToLocationById } from "@/utils/scrollToLocation";
import TeamMemberPickerModal from "../team/TeamMemberPickerModal";
import { getTeamSlots } from "../team/teamSlots";
import { useTeamMemberPicker } from "../team/useTeamMemberPicker";
import { GraveyardGridItem } from "./GraveyardGridItem";
import PCEntryItem from "./PCEntryItem";
import {
  getDeceasedEntries,
  getPCTab,
  getPCTabIndex,
  getStoredEntries,
} from "./pcSheetDomain";
import TeamEntryItem from "./TeamEntryItem";

export interface PokemonPCSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "team" | "box" | "graveyard";
  onChangeTab: (tab: "team" | "box" | "graveyard") => void;
}

import type { PCEntry as Entry } from "./types";

export default function PokemonPCSheet({
  isOpen,
  onClose,
  activeTab,
  onChangeTab,
}: PokemonPCSheetProps) {
  const activePlaythrough = useActivePlaythrough();
  const encounters = useEncounters();
  const customLocations = useCustomLocations();

  const {
    pickerModalOpen,
    selectedPosition,
    openPicker,
    closePicker,
    selectTeamMember,
  } = useTeamMemberPicker();

  const mergedLocations = useMemo(
    () => getLocationsSortedWithCustom(customLocations),
    [customLocations],
  );

  const idToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const loc of mergedLocations) map.set(loc.id, loc.name);
    return map;
  }, [mergedLocations]);

  const pokemonByUid = useMemo(
    () => buildPokemonUidIndex(encounters),
    [encounters],
  );

  // Handlers for team member picker modal
  const handleTeamMemberClick = useCallback(
    (
      position: number,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _existingTeamMember: {
        position: number;
        isEmpty: boolean;
        headPokemon: PokemonOptionType | null;
        bodyPokemon: PokemonOptionType | null;
        isFusion: boolean;
      },
    ) => {
      openPicker(position);
    },
    [openPicker],
  );

  const team: Entry[] = useMemo(
    () =>
      activePlaythrough?.team
        ? getTeamSlots(
            activePlaythrough.team.members,
            encounters,
            pokemonByUid,
          ).map(
            ({
              position,
              locationName,
              headPokemon,
              bodyPokemon,
              isFusion,
            }) => ({
              locationId: `team-slot-${position}`,
              locationName,
              head: headPokemon,
              body: bodyPokemon,
              position,
              isFusion,
            }),
          )
        : [],
    [activePlaythrough?.team, encounters, pokemonByUid],
  );

  const deceased: Entry[] = useMemo(
    () => getDeceasedEntries(encounters, idToName),
    [encounters, idToName],
  );

  const stored: Entry[] = useMemo(
    () => getStoredEntries(encounters, idToName),
    [encounters, idToName],
  );

  const selectedIndex = getPCTabIndex(activeTab);

  // Memoize the onClose handler to prevent unnecessary re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoize the onChangeTab handler
  const handleChangeTab = useCallback(
    (index: number) => {
      onChangeTab(getPCTab(index));
    },
    [onChangeTab],
  );

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      className="group relative z-[70]"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] transition-opacity duration-200 ease-out data-closed:opacity-0 data-enter:opacity-100 dark:bg-black/30"
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 z-[71] flex w-screen items-stretch justify-end p-0">
        <DialogPanel
          transition
          id="pokemon-pc-sheet"
          aria-labelledby="pokemon-pc-title"
          className={clsx(
            "h-full w-full max-w-lg border-l border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800",
            "transform-gpu will-change-transform",
            "transition-all duration-200 ease-out",
            "data-closed:translate-x-full data-closed:opacity-0 data-leave:translate-x-full",
            "flex flex-col",
          )}
        >
          <div className="px-4 py-2.5">
            <div className="flex items-center justify-between">
              <DialogTitle
                id="pokemon-pc-title"
                className="text-sm font-semibold text-gray-900 dark:text-white"
              >
                Pokémon PC
              </DialogTitle>
              <button
                onClick={handleClose}
                className={clsx(
                  "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2",
                  "rounded-md p-1 transition-colors cursor-pointer",
                )}
                aria-label="Close drawer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content area: fills remaining height to allow true vertical centering */}
          <div className="flex min-h-0 flex-1 flex-col px-4 pt-2 pb-3">
            <TabGroup selectedIndex={selectedIndex} onChange={handleChangeTab}>
              <TabList className="mb-4 flex w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:pb-0 [&::-webkit-scrollbar]:hidden">
                <Tab
                  className={({ selected }) =>
                    clsx(
                      "inline-flex min-w-[7.25rem] shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none sm:flex-1",
                      selected
                        ? "border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                    )
                  }
                >
                  <Users className="h-4 w-4" />
                  <span className="font-medium flex-1">Team</span>
                  <span className="ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                    {team.filter((entry) => entry.head || entry.body).length}/6
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      "inline-flex min-w-[7.25rem] shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none sm:flex-1",
                      selected
                        ? "border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                    )
                  }
                >
                  <Box className="h-4 w-4" />
                  <span className="font-medium flex-1">Box</span>
                  <span className="ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                    {stored.length}
                  </span>
                </Tab>
                <Tab
                  className={({ selected }) =>
                    clsx(
                      "inline-flex min-w-[7.25rem] shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus:outline-none sm:flex-1",
                      selected
                        ? "border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                        : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
                    )
                  }
                >
                  <Skull className="h-4 w-4" />
                  <span className="font-medium flex-1">Graveyard</span>
                  <span className="ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100">
                    {deceased.length}
                  </span>
                </Tab>
              </TabList>

              <TabPanels className="flex min-h-0 flex-1 flex-col">
                <TabPanel className="flex min-h-0 flex-1">
                  <div
                    aria-label="Team members list"
                    className="w-full space-y-3 py-2 max-h-[calc(100dvh-6.5rem)] overflow-y-auto"
                  >
                    {team.map((entry) => (
                      <TeamEntryItem
                        key={entry.locationId}
                        entry={entry}
                        idToName={idToName}
                        onClose={handleClose}
                        onTeamMemberClick={handleTeamMemberClick}
                      />
                    ))}
                  </div>
                </TabPanel>
                <TabPanel className="flex min-h-0 flex-1">
                  {stored.length === 0 ? (
                    <div
                      className="flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-4 text-gray-600 dark:text-gray-300"
                      role="status"
                      aria-live="polite"
                    >
                      <Boxes
                        className="mb-3 h-10 w-10 opacity-50"
                        aria-hidden="true"
                      />
                      <p className="text-center">No Pokémon in your box.</p>
                    </div>
                  ) : (
                    <div
                      aria-label="Boxed Pokémon list"
                      className="grid content-start w-full grid-cols-1 gap-2 py-2 sm:grid-cols-2 h-[calc(100dvh-6.5rem)] overflow-y-auto"
                    >
                      {stored.map((entry) => (
                        <PCEntryItem
                          key={entry.locationId}
                          entry={entry}
                          idToName={idToName}
                          mode="stored"
                          hoverRingClass="hover:ring-blue-400/30"
                          fallbackLabel="Boxed Pokémon"
                          className=""
                          onClose={handleClose}
                        />
                      ))}
                    </div>
                  )}
                </TabPanel>
                <TabPanel className="flex min-h-0 flex-1">
                  {deceased.length === 0 ? (
                    <div
                      className="flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-4 text-gray-600 dark:text-gray-300"
                      role="status"
                      aria-live="polite"
                    >
                      <Skull
                        className="mb-3 h-10 w-10 opacity-50"
                        aria-hidden="true"
                      />
                      <p className="text-center">
                        No fallen Pokémon. Keep it that way!
                      </p>
                    </div>
                  ) : (
                    <div className="w-full py-2 h-[calc(100dvh-6.5rem)] overflow-y-auto">
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {deceased.map((entry) => (
                          <GraveyardGridItem
                            key={entry.locationId}
                            entry={entry}
                            onLocationClick={(locationId) => {
                              // Scroll to location in the encounter table
                              const highlightUids: string[] = [];
                              const pokemon = entry.head || entry.body;
                              if (pokemon?.uid) {
                                highlightUids.push(pokemon.uid);
                              }

                              scrollToLocationById(locationId, {
                                behavior: "smooth",
                                highlightUids,
                                durationMs: 1200,
                              });

                              handleClose();
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </DialogPanel>
      </div>

      {/* Team Member Picker Modal */}
      <TeamMemberPickerModal
        isOpen={pickerModalOpen}
        onClose={closePicker}
        onSelect={selectTeamMember}
        position={selectedPosition || 0}
        existingTeamMember={
          selectedPosition !== null
            ? {
                position: selectedPosition,
                isEmpty: false,
                headPokemon: team[selectedPosition]?.head || null,
                bodyPokemon: team[selectedPosition]?.body || null,
                isFusion: team[selectedPosition]?.isFusion || false,
              }
            : null
        }
      />
    </Dialog>
  );
}

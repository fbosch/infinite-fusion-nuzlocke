import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import clsx from "clsx";
import { Box, Boxes, type LucideIcon, Skull, Users } from "lucide-react";
import { scrollToLocationById } from "@/utils/scrollToLocation";
import { GraveyardGridItem } from "./GraveyardGridItem";
import PCEntryItem from "./PCEntryItem";
import { getPCTab, getPCTabIndex, type PCTab } from "./pcSheetDomain";
import TeamEntryItem from "./TeamEntryItem";
import type { PCEntry } from "./types";

interface PokemonPCSheetContentProps {
  activeTab: PCTab;
  onChangeTab: (tab: PCTab) => void;
  team: PCEntry[];
  stored: PCEntry[];
  deceased: PCEntry[];
  idToName: Map<string, string>;
  onClose: () => void;
  onOpenTeamMemberPicker: (position: number) => void;
}

interface PCSheetTabProps {
  icon: LucideIcon;
  label: string;
  count: string | number;
}

function PCSheetTab({ icon: Icon, label, count }: PCSheetTabProps) {
  return (
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
      <Icon className="h-4 w-4" />
      <span className="font-medium flex-1">{label}</span>
      <span className="ml-1 rounded bg-gray-200 px-1 text-[10px] text-gray-800 dark:bg-gray-600 dark:text-gray-100">
        {count}
      </span>
    </Tab>
  );
}

function EmptyPCPanel({
  icon: Icon,
  message,
}: {
  icon: LucideIcon;
  message: string;
}) {
  return (
    <div
      className="flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-4 text-gray-600 dark:text-gray-300"
      role="status"
      aria-live="polite"
    >
      <Icon className="mb-3 h-10 w-10 opacity-50" aria-hidden="true" />
      <p className="text-center">{message}</p>
    </div>
  );
}

export function PokemonPCSheetContent({
  activeTab,
  onChangeTab,
  team,
  stored,
  deceased,
  idToName,
  onClose,
  onOpenTeamMemberPicker,
}: PokemonPCSheetContentProps) {
  const teamCount = team.filter((entry) => entry.head || entry.body).length;

  return (
    <TabGroup
      selectedIndex={getPCTabIndex(activeTab)}
      onChange={(index) => onChangeTab(getPCTab(index))}
    >
      <TabList className="mb-4 flex w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <PCSheetTab icon={Users} label="Team" count={`${teamCount}/6`} />
        <PCSheetTab icon={Box} label="Box" count={stored.length} />
        <PCSheetTab icon={Skull} label="Graveyard" count={deceased.length} />
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
                onClose={onClose}
                onTeamMemberClick={onOpenTeamMemberPicker}
              />
            ))}
          </div>
        </TabPanel>
        <TabPanel className="flex min-h-0 flex-1">
          {stored.length === 0 ? (
            <EmptyPCPanel icon={Boxes} message="No Pokémon in your box." />
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
                  onClose={onClose}
                />
              ))}
            </div>
          )}
        </TabPanel>
        <TabPanel className="flex min-h-0 flex-1">
          {deceased.length === 0 ? (
            <EmptyPCPanel
              icon={Skull}
              message="No fallen Pokémon. Keep it that way!"
            />
          ) : (
            <div className="w-full py-2 h-[calc(100dvh-6.5rem)] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {deceased.map((entry) => (
                  <GraveyardGridItem
                    key={entry.locationId}
                    entry={entry}
                    onLocationClick={(locationId) => {
                      const pokemon = entry.head || entry.body;
                      scrollToLocationById(locationId, {
                        behavior: "smooth",
                        highlightUids: pokemon?.uid ? [pokemon.uid] : [],
                        durationMs: 1200,
                      });
                      onClose();
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </TabPanel>
      </TabPanels>
    </TabGroup>
  );
}

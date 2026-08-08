import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import clsx from "clsx";
import { Box, Boxes, type LucideIcon, Skull, Users } from "lucide-react";
import { scrollToLocationById } from "@/utils/scrollToLocation";
import { GraveyardGridItem } from "./graveyard-grid-item";
import PCEntryItem from "./pc-entry-item";
import { getPCTab, getPCTabIndex, type PCTab } from "./pc-sheet-domain";
import TeamEntryItem from "./team-entry-item";
import type { PCEntry } from "./types";

interface PokemonPCSheetContentProps {
  activeTab: PCTab;
  deceased: PCEntry[];
  idToName: Map<string, string>;
  onChangeTab: (tab: PCTab) => void;
  onClose: () => void;
  onOpenTeamMemberPicker: (position: number) => void;
  stored: PCEntry[];
  team: PCEntry[];
}

interface PCSheetTabProps {
  count: string | number;
  icon: LucideIcon;
  label: string;
}

function PCSheetTab({ icon: Icon, label, count }: PCSheetTabProps) {
  return (
    <Tab
      className={({ selected }) =>
        clsx(
          "inline-flex min-w-[7.25rem] shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:flex-1",
          selected
            ? "border-gray-300 bg-white text-gray-900 shadow dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            : "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span className="flex-1 font-medium">{label}</span>
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
      aria-live="polite"
      className="flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-4 text-gray-600 dark:text-gray-300"
      role="status"
    >
      <Icon aria-hidden="true" className="mb-3 h-10 w-10 opacity-50" />
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
      onChange={(index) => onChangeTab(getPCTab(index))}
      selectedIndex={getPCTabIndex(activeTab)}
    >
      <TabList className="mb-4 flex w-full flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:none] sm:pb-0 [&::-webkit-scrollbar]:hidden">
        <PCSheetTab count={`${teamCount}/6`} icon={Users} label="Team" />
        <PCSheetTab count={stored.length} icon={Box} label="Box" />
        <PCSheetTab count={deceased.length} icon={Skull} label="Graveyard" />
      </TabList>

      <TabPanels className="flex min-h-0 flex-1 flex-col">
        <TabPanel className="flex min-h-0 flex-1">
          <div
            aria-label="Team members list"
            className="max-h-[calc(100dvh-6.5rem)] w-full space-y-3 overflow-y-auto py-2"
          >
            {team.map((entry) => (
              <TeamEntryItem
                entry={entry}
                idToName={idToName}
                key={entry.locationId}
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
              className="grid h-[calc(100dvh-6.5rem)] w-full grid-cols-1 content-start gap-2 overflow-y-auto py-2 sm:grid-cols-2"
            >
              {stored.map((entry) => (
                <PCEntryItem
                  className=""
                  entry={entry}
                  fallbackLabel="Boxed Pokémon"
                  hoverRingClass="hover:ring-blue-400/30"
                  idToName={idToName}
                  key={entry.locationId}
                  mode="stored"
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
            <div className="h-[calc(100dvh-6.5rem)] w-full overflow-y-auto py-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {deceased.map((entry) => (
                  <GraveyardGridItem
                    entry={entry}
                    key={entry.locationId}
                    onLocationClick={(locationId) => {
                      const pokemon = entry.head || entry.body;
                      scrollToLocationById(locationId, {
                        behavior: "smooth",
                        durationMs: 1200,
                        highlightUids: pokemon?.uid ? [pokemon.uid] : [],
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

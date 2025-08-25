'use client';
import { Computer, Settings } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { CursorTooltip } from '@/components/CursorTooltip';
import dynamic from 'next/dynamic';
import SettingsModal from './SettingsModal';

const PokemonPCSheet = dynamic(() => import('@/components/pc/PokemonPCSheet'), {
  ssr: false,
});

export default function MenuItems() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'box' | 'graveyard'>(
    'team'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <div className='flex items-start gap-1'>
        <CursorTooltip
          content={
            <div className='flex flex-col gap-1 min-w-32'>
              <div className='font-medium text-sm'>Pokémon PC</div>
              <div className='text-xs text-gray-600 dark:text-gray-300'>
                Manage your team, box, and graveyard
              </div>
            </div>
          }
          delay={300}
        >
          <button
            type='button'
            className={clsx(
              'group relative p-1.5 rounded-md border border-transparent',
              'bg-transparent text-gray-400 dark:text-gray-500',
              'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-600 dark:hover:text-gray-300',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-1',
              'transition-all duration-150 cursor-pointer',
              'hover:scale-105'
            )}
            aria-label='Open Pokémon PC'
            onClick={() => setDrawerOpen(true)}
          >
            <Computer className='h-4 w-4' />
          </button>
        </CursorTooltip>

        <CursorTooltip
          content={
            <div className='flex flex-col gap-1 min-w-32'>
              <div className='font-medium text-sm'>Settings</div>
              <div className='text-xs text-gray-600 dark:text-gray-300'>
                Configure app preferences and options
              </div>
            </div>
          }
          delay={300}
        >
          <button
            type='button'
            className={clsx(
              'group relative p-1.5 rounded-md border border-transparent',
              'bg-transparent text-gray-400 dark:text-gray-500',
              'hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-600 dark:hover:text-gray-300',
              'focus:outline-none focus-visible:ring-1 focus-visible:ring-gray-300 focus-visible:ring-offset-1',
              'transition-all duration-150 cursor-pointer',
              'hover:scale-105'
            )}
            aria-label='Open Settings'
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className='h-4 w-4' />
          </button>
        </CursorTooltip>

        {/* Future menu items can be added here */}
        {/* Example:
        <MenuButton
          icon={<Help className="h-4 w-4" />}
          label="Help"
          onClick={() => {}}
        />
        */}
      </div>

      <PokemonPCSheet
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}

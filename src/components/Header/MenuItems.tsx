'use client';
import { Computer, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';
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

  // Debug effect to track drawerOpen changes
  useEffect(() => {
    console.log('MenuItems useEffect - drawerOpen changed to:', drawerOpen);
  }, [drawerOpen]);

  const handleOpenDrawer = () => {
    console.log('MenuItems handleOpenDrawer called');
    setDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    console.log('MenuItems handleCloseDrawer called');
    setDrawerOpen(false);
  };

  return (
    <>
      <div className='flex items-center gap-1 mr-3'>
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
              'inline-flex items-center justify-center w-9 h-9 rounded-md',
              'bg-transparent text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
              'transition-all duration-150 cursor-pointer',
              'border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            )}
            aria-label='Open Settings'
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className='h-4 w-4' />
          </button>
        </CursorTooltip>
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
              'inline-flex items-center justify-center w-9 h-9 rounded-md',
              'bg-transparent text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-300',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1',
              'transition-all duration-150 cursor-pointer',
              'border border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
            )}
            aria-label='Open Pokémon PC'
            onClick={handleOpenDrawer}
          >
            <Computer className='h-4 w-4' />
          </button>
        </CursorTooltip>
      </div>

      <PokemonPCSheet
        isOpen={drawerOpen}
        onClose={handleCloseDrawer}
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

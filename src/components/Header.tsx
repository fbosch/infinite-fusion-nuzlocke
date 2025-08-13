'use client';
import Logo from '@/components/Logo';
import PlaythroughMenu from '@/components/playthrough/PlaythroughMenu';
import dynamic from 'next/dynamic';
import { Computer } from 'lucide-react';
import { useState } from 'react';
import clsx from 'clsx';
import { CursorTooltip } from '@/components/CursorTooltip';
import Link from 'next/link';

const PokemonPCSheet = dynamic(() => import('@/components/pc/PokemonPCSheet'), {
  ssr: false,
});

export default function Header() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'box' | 'graveyard'>(
    'team'
  );
  return (
    <div>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50'
      >
        Skip to main content
      </a>

      <div className='mx-auto max-w-[1500px] px-4 md:px-6 2xl:px-0'>
        <header className='mb-2 py-2 sm:mb-4 sm:pt-5 '>
          <div className='flex items-center justify-between gap-4'>
            <Link href='/' className='flex items-center gap-3 justify-start'>
              <Logo className='w-18 sm:w-14' />
              <div className='sr-only md:not-sr-only self-start'>
                <h1 className='text-xs font-medium tracking-[0.01em] sm:text-[0.85rem]'>
                  <span className='bg-gradient-to-r from-cyan-600 via-indigo-700 to-rose-400 bg-clip-text text-transparent dark:from-cyan-300 dark:via-violet-300 dark:to-rose-200'>
                    Pokémon Infinite Fusion
                  </span>
                  <div className='text-base font-medium text-gray-800 sm:text-xl dark:text-white'>
                    Nuzlocke Tracker
                  </div>
                </h1>
              </div>
            </Link>
            <div className='flex items-center gap-2'>
              <CursorTooltip content='Open Pokémon PC' delay={500}>
                <button
                  type='button'
                  className={clsx(
                    'p-2 rounded-md border border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    'hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
                    'cursor-pointer items-center'
                  )}
                  aria-label='Open Pokémon PC'
                  onClick={() => setDrawerOpen(true)}
                >
                  <Computer className='h-5 w-5' />
                </button>
              </CursorTooltip>
              <div
                role='separator'
                aria-orientation='vertical'
                className='h-5 w-px bg-gray-200 dark:bg-gray-700 mx-1.5'
                aria-hidden='true'
              />
              <PlaythroughMenu />
            </div>
          </div>
        </header>
      </div>
      <PokemonPCSheet
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
      />
    </div>
  );
}

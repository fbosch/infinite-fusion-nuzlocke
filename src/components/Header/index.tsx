'use client';
import Logo from '@/components/Logo';
import PlaythroughMenu from '@/components/playthrough/PlaythroughMenu';
import MenuItems from './MenuItems';
import TeamSlots from '@/components/team/TeamSlots';
import Link from 'next/link';

export default function Header() {
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
          <div className='flex items-start justify-between gap-4'>
            <div className='flex flex-col gap-2'>
              <Link
                href='/'
                className='flex items-center gap-3 justify-start drop-shadow-xs/5'
              >
                <Logo className='w-12' />
                <div className='self-start'>
                  <h1 className='text-sm font-medium tracking-[0.01em] sm:text-sm'>
                    <span className='bg-gradient-to-r from-sky-800 via-blue-700 to-pink-500 bg-clip-text tracking-wide text-transparent dark:from-cyan-200 dark:via-violet-300 dark:to-rose-200 whitespace-nowrap'>
                      Pokémon Infinite Fusion
                    </span>
                    <div className='text-base font-medium text-gray-800 sm:text-xl dark:text-white whitespace-nowrap'>
                      Nuzlocke Tracker
                    </div>
                  </h1>
                </div>
              </Link>

              {/* Settings and PC buttons underneath logo */}
              <div className='flex items-center gap-1'>
                <MenuItems />
              </div>
            </div>

            {/* Team Slots */}
            <div className='flex-1 flex justify-center pt-1.5'>
              <TeamSlots />
            </div>

            <div className='flex items-start'>
              <PlaythroughMenu />
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}

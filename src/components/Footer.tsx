'use client';

import CookieSettingsButton from '@/components/analytics/CookieSettingsButton';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Github } from 'lucide-react';
import clsx from 'clsx';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className='flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5'>
        <div className='w-7 h-7 rounded bg-gray-200 dark:bg-gray-700' />
        <div className='w-7 h-7 rounded' />
        <div className='w-7 h-7 rounded' />
      </div>
    );
  }

  const themes = [
    { value: 'system', icon: Monitor, label: 'System theme' },
    { value: 'light', icon: Sun, label: 'Light theme' },
    { value: 'dark', icon: Moon, label: 'Dark theme' },
  ];

  return (
    <div
      className='flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5'
      role='radiogroup'
      aria-label='Theme selection'
    >
      {themes.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={clsx(
            'flex items-center justify-center w-7 h-7 rounded transition-all duration-200 cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gray-400',
            theme === value
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          )}
          aria-label={label}
          title={label}
          role='radio'
          aria-checked={theme === value}
        >
          <Icon className='w-3.5 h-3.5' />
        </button>
      ))}
    </div>
  );
}

export default function Footer() {
  return (
    <footer className='border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 mt-8'>
      <div className='max-w-[1500px] mx-auto px-8 py-6'>
        <div className='space-y-4'>
          {/* Top section with button on left and links in center */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex flex-col md:flex-row justify-center space-x-6'>
              <a
                href='https://discord.gg/infinitefusion'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm font-medium'
              >
                Join Discord Community
              </a>
              <a
                href='https://infinitefusion.fandom.com/wiki/Pok%C3%A9mon_Infinite_Fusion_Wiki'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm font-medium'
              >
                Wiki
              </a>
              <a
                href='https://infinitefusiondex.com/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm font-medium'
              >
                Infinitefusiondex
              </a>
            </div>
            <div className='flex items-center gap-3'>
              <ThemeToggle />
              <CookieSettingsButton />
              <a
                href='https://github.com/fbosch/infinite-fusion-nuzlocke'
                target='_blank'
                rel='noopener noreferrer'
                className='bg-gray-100 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md p-1.5 transition-colors  gap-1.5 cursor-pointer'
              >
                <Github className='w-4 h-4' />
              </a>
            </div>
          </div>

          {/* Disclaimer */}
          <div className='md:text-center text-sm text-gray-600 dark:text-gray-400 space-y-1'>
            <p>
              Pokémon and Pokémon character names are trademarks of Nintendo.
            </p>
            <p>
              Pokémon character designs are © 1995–2025 The Pokémon Company
            </p>
            <p>
              This website is not affiliated with The Pokémon Company, Nintendo,
              Game Freak Inc., or Creatures Inc.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

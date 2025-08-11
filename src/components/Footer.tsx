'use client';

import CookieSettingsButton from '@/components/analytics/CookieSettingsButton';
import CreditsModal from '@/components/CreditsModal';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import clsx from 'clsx';
import { useInView } from 'react-intersection-observer';
import GitHubButton from 'react-github-btn';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className='flex items-center bg-gray-100 dark:bg-gray-800 rounded-sm p-0.5'>
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
      className='flex items-center bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 content-visibility-auto contain-intrinsic-height-[195px]'
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
  const { ref, inView } = useInView({
    threshold: 0.5,
    triggerOnce: true,
  });
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCreditsOpen, setIsCreditsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine the color scheme based on the current theme
  const getColorScheme = () => {
    if (!mounted) return 'no-preference: light; light: light; dark: dark;';

    switch (resolvedTheme) {
      case 'light':
        return 'light';
      case 'dark':
        return 'dark';
      default:
        return 'no-preference: light; light: light; dark: dark;';
    }
  };

  return (
    <footer
      ref={ref}
      className='border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 mt-8'
    >
      <div className='max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6'>
        <div className='space-y-4'>
          {/* Top section with button on left and links in center */}
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div className='flex flex-col md:flex-row justify-center space-x-6'>
              <a
                href='https://discord.gg/infinitefusion'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm '
              >
                Join Discord Community
              </a>
              <a
                href='https://infinitefusion.fandom.com/wiki/Pok%C3%A9mon_Infinite_Fusion_Wiki'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm '
              >
                Wiki
              </a>
              <a
                href='https://infinitefusiondex.com/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm '
              >
                InfiniteDex
              </a>
              <a
                href='https://www.fusiondex.org/'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm '
              >
                FusionDex
              </a>
            </div>
            <div className='flex flex-col sm:flex-row items-center gap-3'>
              <div
                className={clsx(
                  'flex gap-x-3 pt-1.5 sm:pr-3 sm:border-r border-gray-200 dark:border-gray-700',
                  inView ? 'opacity-100' : 'opacity-0'
                )}
              >
                <GitHubButton
                  href='https://github.com/fbosch/infinite-fusion-nuzlocke'
                  data-color-scheme={getColorScheme()}
                  data-icon='octicon-star'
                  data-size='large'
                  data-show-count='true'
                  aria-label='Star fbosch/infinite-fusion-nuzlocke on GitHub'
                >
                  Star
                </GitHubButton>
                <GitHubButton
                  href='https://github.com/fbosch/infinite-fusion-nuzlocke/issues'
                  data-color-scheme={getColorScheme()}
                  data-icon='octicon-issue-opened'
                  data-size='large'
                  data-show-count='true'
                  aria-label='Issue fbosch/infinite-fusion-nuzlocke on GitHub'
                >
                  Issue
                </GitHubButton>
              </div>
              <ThemeToggle />
              <CookieSettingsButton />
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
          <div className='mt-2 md:text-center'>
            <button
              onClick={() => setIsCreditsOpen(true)}
              className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm cursor-pointer'
              aria-haspopup='dialog'
              aria-controls='credits-modal'
            >
              Credits
            </button>
            <span className='mx-2 text-gray-400'>·</span>
            <a
              href='/licenses'
              className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200 text-sm'
            >
              Open source licenses
            </a>
          </div>
          <CreditsModal
            isOpen={isCreditsOpen}
            onClose={() => setIsCreditsOpen(false)}
          />
        </div>
      </div>
    </footer>
  );
}

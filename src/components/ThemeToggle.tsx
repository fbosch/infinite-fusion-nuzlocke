'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Palette } from 'lucide-react';
import clsx from 'clsx';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !resolvedTheme) {
    return (
      <button
        className='p-2 rounded-md bg-gray-100 border border-gray-300 text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-500'
        aria-label='Theme toggle (loading)'
        disabled
      >
        <Palette className='w-5 h-5' />
      </button>
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      cycleTheme();
    }
  };

  const getThemeIcon = () => {
    if (theme === 'light') {
      return <Sun className='w-5 h-5' />;
    } else if (theme === 'dark') {
      return <Moon className='w-5 h-5' />;
    } else {
      return <Palette className='w-5 h-5' />;
    }
  };

  const getThemeLabel = () => {
    if (theme === 'light') {
      return 'Switch to dark theme';
    } else if (theme === 'dark') {
      return 'Switch to system theme';
    } else {
      return 'Switch to light theme';
    }
  };

  return (
    <button
      onClick={cycleTheme}
      onKeyDown={handleKeyDown}
      className={clsx(
        'p-2 rounded-md transition-colors',
        'bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600',
        'border border-gray-300 hover:border-blue-300',
        'dark:bg-gray-700 dark:hover:bg-blue-900/20 dark:text-gray-400 dark:hover:text-blue-400',
        'dark:border-gray-600 dark:hover:border-blue-400',
        'hover:cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1'
      )}
      aria-label={getThemeLabel()}
      title={getThemeLabel()}
      type='button'
    >
      {getThemeIcon()}
    </button>
  );
}

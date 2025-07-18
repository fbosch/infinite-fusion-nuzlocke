'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
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
        className='p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
        aria-label='Theme toggle (loading)'
        disabled
      >
        <Monitor className='w-5 h-5' />
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
      return <Sun className='w-5 h-5 text-yellow-600' />;
    } else if (theme === 'dark') {
      return <Moon className='w-5 h-5 text-blue-300' />;
    } else {
      return <Monitor className='w-5 h-5 ' />;
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
        'bg-gray-200 text-gray-600 hover:bg-gray-300',
        'dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
        'hover:cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset'
      )}
      aria-label={getThemeLabel()}
      title={getThemeLabel()}
      type='button'
    >
      {getThemeIcon()}
    </button>
  );
}

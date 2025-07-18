'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor, Circle, } from 'lucide-react';
import clsx from 'clsx';

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !resolvedTheme) {
    return (
      <button className="p-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
        <Monitor className="w-5 h-5" />
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

  const getThemeIcon = () => {
    if (theme === 'light') {
      return <Sun className="w-5 h-5 text-yellow-600" />;
    } else if (theme === 'dark') {
      return <Moon className="w-5 h-5 text-blue-300" />;
    } else {
      return <Monitor className="w-5 h-5 " />;
    }
  };

  return (
    <button
      onClick={cycleTheme}
      className={clsx(
        "p-2 rounded-md transition-colors",
        "bg-gray-200 text-gray-600 hover:bg-gray-300",
        "dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600",
        "hover:cursor-pointer"
      )}
      aria-label={
        theme === 'light'
          ? 'Switch to dark theme'
          : theme === 'dark'
            ? 'Switch to system theme'
            : 'Switch to light theme'
      }
      title={
        theme === 'light'
          ? 'Switch to dark theme'
          : theme === 'dark'
            ? 'Switch to system theme'
            : 'Switch to light theme'
      }
      type="button"
    >
      {getThemeIcon()}
    </button>
  );
} 
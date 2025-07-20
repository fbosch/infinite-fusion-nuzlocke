import LocationList from '@/components/LocationList';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { Sparkle } from 'lucide-react';

export default function Home() {
  return (
    <div className='bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Skip link for keyboard navigation */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50'
      >
        Skip to main content
      </a>

      <main
        id='main-content'
        className='max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8'
        role='main'
      >
        <header className='py-3 sm:py-4 mb-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
              <Logo />
              <h1 className='ml-4'>
                <span className='block text-sm sm:text-lg font-medium bg-gradient-to-r from-cyan-600 via-indigo-700 to-rose-400 bg-clip-text text-transparent dark:from-cyan-300 dark:via-violet-300 dark:to-rose-200'>
                  Pokémon Infinite Fusion
                </span>
                <div className='flex items-center space-x-1 text-gray-800 dark:text-white'>
                  <Sparkle
                    className='size-4'
                    strokeWidth={2}
                    fill='currentColor'
                  />
                  <span className='block text-lg sm:text-xl font-bold'>
                    Nuzlocke Tracker
                  </span>
                  <Sparkle
                    className='size-4'
                    strokeWidth={2}
                    fill='currentColor'
                  />
                </div>
              </h1>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <section aria-labelledby='locations-heading' className='pb-10'>
          <h2 id='locations-heading' className='sr-only'>
            Game Locations
          </h2>
          <LocationList />
        </section>
      </main>
    </div>
  );
}

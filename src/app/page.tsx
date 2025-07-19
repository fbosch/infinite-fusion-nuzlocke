import LocationList from '@/components/LocationList';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className=' bg-gray-50 dark:bg-gray-900'>
      {/* Skip link for keyboard navigation */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50'
      >
        Skip to main content
      </a>

      <main id='main-content' className='max-w-[1500px] mx-auto' role='main'>
        <header className='flex items-center justify-between mb-8'>
          <h1 className='text-4xl font-bold text-gray-900 dark:text-white font-mono'>
            Infinite Fusion Nuzlocke Tracker
          </h1>
          <ThemeToggle />
        </header>

        <section aria-labelledby='locations-heading'>
          <h2 id='locations-heading' className='sr-only'>
            Game Locations
          </h2>
          <LocationList />
        </section>
      </main>
    </div>
  );
}

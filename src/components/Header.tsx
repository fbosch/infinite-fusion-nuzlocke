import Logo from '@/components/Logo';
import PlaythroughMenu from '@/components/playthrough/PlaythroughMenu';

export default function Header() {
  return (
    <div>
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50'
      >
        Skip to main content
      </a>

      <div className='max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8'>
        <header className='py-3 sm:pt-6 mb-4'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
            <div className='flex items-center gap-3'>
              <Logo />
              <h1 className='sr-only sm:not-sr-only'>
                <span className='block text-sm sm:text-md font-semibold bg-gradient-to-r from-cyan-600 via-indigo-700 to-rose-400 bg-clip-text text-transparent dark:from-cyan-300 dark:via-violet-300 dark:to-rose-200'>
                  Pokémon Infinite Fusion
                </span>
                <div className='flex items-center space-x-1 text-gray-800 dark:text-white tracking-tight'>
                  <span className='block text-lg sm:text-xl font-bold'>
                    Nuzlocke Tracker
                  </span>
                </div>
              </h1>
            </div>
            <div className='flex items-center justify-center sm:justify-end'>
              <PlaythroughMenu />
            </div>
          </div>
        </header>
      </div>
    </div>
  );
}

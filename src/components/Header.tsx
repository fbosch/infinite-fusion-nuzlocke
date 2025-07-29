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

      <div className='mx-auto max-w-[1500px] px-4 md:px-6 2xl:px-0'>
        <header className='mb-2 py-2 sm:mb-4 sm:pt-5 '>
          <div className='flex items-center justify-between gap-4'>
            <div className='flex items-center gap-3 justify-start'>
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
            </div>
            <PlaythroughMenu />
          </div>
        </header>
      </div>
    </div>
  );
}

export default function Footer() {
  return (
    <footer className='border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 mt-8'>
      <div className='max-w-7xl mx-auto px-4 py-6'>
        <div className='text-center space-y-4'>
          <div className='flex justify-center space-x-6'>
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

          {/* Disclaimer */}
          <div className='text-sm text-gray-600 dark:text-gray-400 space-y-1'>
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

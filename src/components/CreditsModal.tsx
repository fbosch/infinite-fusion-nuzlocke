'use client';

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from '@headlessui/react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} className='relative z-50 group'>
      <DialogBackdrop
        transition
        className='fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px] data-closed:opacity-0 data-enter:opacity-100'
        aria-hidden='true'
      />

      <div className='fixed inset-0 flex w-screen items-center justify-center p-4'>
        <DialogPanel
          transition
          id='credits-modal'
          aria-labelledby='credits-modal-title'
          className={clsx(
            'max-w-2xl w-full max-h-[80vh] space-y-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col',
            'transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-98'
          )}
        >
          <div className='flex items-center justify-between'>
            <DialogTitle
              id='credits-modal-title'
              className='text-xl font-semibold text-gray-900 dark:text-white'
            >
              Credits & Licensing
            </DialogTitle>
            <button
              type='button'
              onClick={onClose}
              className={clsx(
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2',
                'p-1 rounded-md transition-colors cursor-pointer'
              )}
              aria-label='Close modal'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='flex-1 overflow-y-auto scrollbar-thin min-h-0'>
            <section className='space-y-2'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                Data Sources & Credits
              </h3>
              <ul className='list-disc list-inside space-y-2 text-sm text-gray-700 dark:text-gray-300'>
                <li>
                  <a
                    href='https://discord.gg/infinitefusion'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                  >
                    Pokemon Infinite Fusion Community
                  </a>
                  <span className='ml-1 text-gray-600 dark:text-gray-400'>
                    All the fusion sprites are made by the community.
                  </span>
                </li>
                <li>
                  <a
                    href='https://infinitefusion.fandom.com/wiki/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                  >
                    Infinite Fusion Wiki (Fandom)
                  </a>
                  <span className='ml-1 text-gray-600 dark:text-gray-400'>
                    Reference for wild encounters, special encounters,
                    locations, and related game info.
                  </span>
                </li>
                <li>
                  <a
                    href='https://pokeapi.co/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                  >
                    PokéAPI
                  </a>
                  <span className='ml-1 text-gray-600 dark:text-gray-400'>
                    Species data (types, evolution chains, metadata).
                  </span>
                </li>
                <li>
                  <a
                    href='https://infinitefusiondex.com/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                  >
                    Infinite Fusion Dex
                  </a>
                  <span className='ml-1 text-gray-600 dark:text-gray-400'>
                    Datasource for fusion sprites and available variants.
                  </span>
                </li>
                <li>
                  <a
                    href='https://github.com/msikma/pokesprite'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                  >
                    PokéSprite (msikma/pokesprite)
                  </a>
                  <span className='ml-1 text-gray-600 dark:text-gray-400'>
                    Small Pokémon icon sprites.
                  </span>
                </li>
                <li>
                  <a
                    href='https://www.fusiondex.org/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
                  >
                    FusionDex
                  </a>
                  <span className='ml-1 text-gray-600 dark:text-gray-400'>
                    Custom sprite variants and artist attributions.
                  </span>
                </li>
              </ul>
            </section>

            <section className='space-y-2 mt-4'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                Trademarks
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                Pokémon and related names are trademarks of their respective
                owners. This project is unaffiliated with Nintendo, Game Freak,
                Creatures Inc., or The Pokémon Company.
              </p>
            </section>
            <section className='space-y-2 mt-4'>
              <h3 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                Licensing
              </h3>
              <p className='text-sm text-gray-600 dark:text-gray-300'>
                This project is licensed under the MIT License.
              </p>
              <a
                href='/licenses'
                target='_blank'
                rel='noopener noreferrer'
                className='text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline'
              >
                View Open Source Licenses
              </a>
            </section>
          </div>

          <div className='flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700'>
            <button
              type='button'
              onClick={onClose}
              className={clsx(
                'px-4 py-2 text-sm rounded-md transition-colors cursor-pointer',
                'bg-gray-100 hover:bg-gray-200 text-gray-900',
                'dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2'
              )}
            >
              Close
            </button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

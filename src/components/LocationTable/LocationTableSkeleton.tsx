import clsx from 'clsx';

export default function LocationTableSkeleton() {
  return (
    <div className='overflow-hidden sm:rounded-lg sm:border sm:border-gray-200 sm:dark:border-gray-700 sm:shadow-sm'>
      <div className='max-h-[90vh] overflow-hidden'>
        <table
          className='w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700'
          role='table'
          aria-label='Loading locations table'
        >
          <thead className='bg-gray-50 dark:bg-gray-800'>
            <tr>
              <th
                className={clsx(
                  'px-4 py-3 text-left text-xs  text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                  'w-[125px]'
                )}
              >
                Location
              </th>
              <th
                className={clsx(
                  'px-4 py-3 text-left text-xs  text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                  'w-[155px] 2xl:w-[195px] '
                )}
              ></th>
              <th
                className={clsx(
                  'px-4 py-3 text-left text-xs  text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                  'w-[62.5vw] 2xl:w-[900px]'
                )}
              >
                Encounter
              </th>
              <th
                className={clsx(
                  'px-4 py-3 text-left text-xs  text-gray-500 dark:text-gray-400 uppercase tracking-wider',
                  'w-[60px]'
                )}
              ></th>
            </tr>
          </thead>
          <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 opacity-10'>
            {Array.from({ length: 16 }).map((_, index) => (
              <tr
                key={index}
                className='hover:bg-gray-50 h-[150px] dark:hover:bg-gray-800 transition-colors'
                style={{ containIntrinsicHeight: '150px' }}
              >
                {/* Location name column */}
                <td className='px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                  <div className='h-6 rounded w-19 shimmer'></div>
                </td>

                {/* Sprite column */}
                <td className='whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                  <div className='size-22 -translate-y-2 translate-x-3 rounded-lg mx-auto shimmer'></div>
                </td>

                {/* Encounter column */}
                <td className='px-4 pt-8.5 pb-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                  <div className='flex flex-row justify-center gap-4 items-center'>
                    <div className='flex-1'>
                      <div className='relative'>
                        <div className='h-24 rounded shimmer'></div>
                      </div>
                    </div>
                    <div className='size-10 rounded shimmer'></div>
                  </div>
                </td>

                {/* Reset column */}
                <td className='p-2 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 align-top'></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

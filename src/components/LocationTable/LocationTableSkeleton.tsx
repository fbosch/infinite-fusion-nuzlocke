export default function LocationTableSkeleton() {
  return (
    <div className='overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm'>
      <table
        className='w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700'
        role='table'
        aria-label='Loading locations table'
      >
        <thead className='bg-gray-50 dark:bg-gray-800'>
          <tr>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '20px', minWidth: '20px' }}
            >
              Location
            </th>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '220px', minWidth: '220px' }}
            ></th>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '900px', minWidth: '900px' }}
            >
              Encounter
            </th>
            <th
              className='px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'
              style={{ width: '60px', minWidth: '60px' }}
            ></th>
          </tr>
        </thead>
        <tbody className='bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700 opacity-10'>
          {Array.from({ length: 12 }).map((_, index) => (
            <tr
              key={index}
              className='hover:bg-gray-50 h-[150px] dark:hover:bg-gray-800 transition-colors'
              style={{ containIntrinsicHeight: '150px' }}
            >
              {/* Location name column */}
              <td className='px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100'>
                <div className='h-5 rounded w-19 shimmer'></div>
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
  );
}

import clsx from 'clsx';

export default function TeamSlotsSkeleton() {
  return (
    <div className='hidden lg:flex flex-col items-center'>
      <div className='flex gap-3 sm:gap-4 md:gap-5'>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              'flex flex-col items-center justify-center relative group/team-slot',
              'size-16 sm:size-18 md:size-20 rounded-full border transition-all duration-200',
              'border-gray-100 dark:border-gray-800/30 bg-white dark:bg-gray-900'
            )}
          >
            {/* Sprite skeleton */}
            <div className='flex flex-col items-center justify-center relative w-full h-full'>
              <div
                className='w-full h-full absolute rounded-full opacity-30 border border-gray-200 dark:border-gray-600 text-gray-300 dark:text-gray-600'
                style={{
                  background: `repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

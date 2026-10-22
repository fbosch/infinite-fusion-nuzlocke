import clsx from "clsx";

export default function TeamSlotsSkeleton() {
  return (
    <div className="hidden flex-col items-center lg:flex">
      <div className="flex gap-3 sm:gap-4 md:gap-5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className={clsx(
              "group/team-slot relative flex flex-col items-center justify-center",
              "size-16 rounded-full border transition-all duration-200 sm:size-18 md:size-20",
              "border-gray-100 bg-white dark:border-gray-800/30 dark:bg-gray-900",
            )}
            key={index}
          >
            {/* Sprite skeleton */}
            <div className="relative flex h-full w-full flex-col items-center justify-center">
              <div
                className="absolute h-full w-full rounded-full border border-gray-200 text-gray-300 opacity-30 dark:border-gray-600 dark:text-gray-600"
                style={{
                  background:
                    "repeating-linear-gradient(currentColor 0px, currentColor 2px, rgba(156, 163, 175, 0.3) 1px, rgba(156, 163, 175, 0.3) 3px)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

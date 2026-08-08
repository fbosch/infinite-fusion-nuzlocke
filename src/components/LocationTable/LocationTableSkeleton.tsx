import clsx from "clsx";
import { locationTableColumnWidths } from "./columnWidths";

export default function LocationTableSkeleton() {
  return (
    <div className="overflow-hidden border-gray-200 border-y md:border xl:shadow-sm 2xl:rounded-lg dark:border-gray-700">
      {/* fallow-ignore-next-line css-token-drift -- Matches the live table viewport constraint. */}
      <div className="scrollbar-thin relative max-h-[93.5vh] overflow-auto overscroll-x-none">
        <table
          aria-label="Loading locations table"
          className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700"
        >
          <thead className="sticky top-0 z-50 bg-gray-50 shadow-[0_0.5px_0_0_rgb(229,231,235)] dark:bg-gray-800 dark:shadow-[0_0.5px_0_0_rgb(55,65,81)]">
            <tr>
              <th
                className={clsx(
                  "px-4 py-3 text-left text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400",
                  locationTableColumnWidths.name,
                )}
              >
                Location
              </th>
              <th
                className={clsx(
                  "px-4 py-3 text-left text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400",
                  locationTableColumnWidths.sprite,
                )}
              />
              <th
                className={clsx(
                  "px-4 py-3 text-left text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400",
                  locationTableColumnWidths.encounter,
                )}
              >
                Encounter
              </th>
              <th
                className={clsx(
                  "px-4 py-3 text-left text-gray-500 text-xs uppercase tracking-wider dark:text-gray-400",
                  locationTableColumnWidths.actions,
                )}
              />
            </tr>
            <tr>
              <th className="p-0" colSpan={4}>
                <div aria-hidden="true" className="h-0.5 translate-y-px" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white opacity-10 dark:divide-gray-700 dark:bg-gray-900">
            {Array.from({ length: 18 }).map((_, index) => (
              <tr
                className="h-location-row transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
                key={index}
                style={{ containIntrinsicHeight: "150px" }}
              >
                {/* Location name column */}
                <td className="whitespace-nowrap px-4 py-3 text-gray-900 text-sm dark:text-gray-100">
                  <div className="shimmer h-6 w-19 rounded" />
                </td>

                {/* Sprite column */}
                <td className="whitespace-nowrap text-gray-900 text-sm dark:text-gray-100">
                  <div className="shimmer mx-auto size-22 -translate-y-2 rounded-lg" />
                </td>

                {/* Encounter column */}
                <td className="whitespace-nowrap px-4 pt-8.5 pb-4 text-gray-900 text-sm dark:text-gray-100">
                  <div className="flex flex-row items-center justify-center gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <div className="shimmer h-24 rounded" />
                      </div>
                    </div>
                    <div className="shimmer size-10 rounded" />
                  </div>
                </td>

                {/* Reset column */}
                <td className="whitespace-nowrap p-2 align-top text-gray-900 text-sm dark:text-gray-100" />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

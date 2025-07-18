import { getLocationsSortedByOrder } from '@/loaders';

export default function LocationList() {
  const locations = getLocationsSortedByOrder();

  return (
    <div className="space-y-3">
      {locations.map((location) => (
        <div
          key={location.name}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{location.name}</h3>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 
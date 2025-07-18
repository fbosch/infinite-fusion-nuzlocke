import { getLocationsByRegion } from '@/loaders';

export default function LocationList() {
  const locationsByRegion = getLocationsByRegion();

  return (
    <div className="space-y-6">
      {Object.entries(locationsByRegion).map(([region, locations]) => (
        <div key={region} className="border rounded-lg p-4">
          <h2 className="text-2xl font-bold mb-4 text-blue-600">{region}</h2>
          <div className="grid gap-3">
            {locations.map((location) => (
              <div
                key={location.name}
                className="border rounded p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{location.name}</h3>
                    <p className="text-gray-600 text-sm">{location.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-500">Order: {location.order}</span>
                    {location.routeId && (
                      <div className="text-xs text-gray-500">Route ID: {location.routeId}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
} 
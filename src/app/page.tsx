
import LocationList from '@/components/LocationList';
import Settings from '@/components/Settings';

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
          Infinite Fusion Nuzlocke Tracker
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <LocationList />
          </div>
          <div className="lg:col-span-1">
            <Settings />
          </div>
        </div>
      </main>
    </div>
  );
}

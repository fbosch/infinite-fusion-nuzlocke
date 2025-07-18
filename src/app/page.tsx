
import LocationList from '@/components/LocationList';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <main className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            Infinite Fusion Nuzlocke Tracker
          </h1>
          <ThemeToggle />
        </div>

        <LocationList />
      </main>
    </div>
  );
}

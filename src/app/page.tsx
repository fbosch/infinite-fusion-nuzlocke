
import LocationList from '@/components/LocationList';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <main className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Infinite Fusion Nuzlocke Tracker
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Welcome to your Pokémon Infinite Fusion Nuzlocke tracker!
        </p>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Available Locations</h2>
          <LocationList />
        </div>
      </main>
    </div>
  );
}

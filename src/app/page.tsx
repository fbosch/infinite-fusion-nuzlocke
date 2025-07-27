import LocationTable from '@/components/LocationTable';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function Home() {
  return (
    <main
      id='main-content'
      className='max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8'
      role='main'
    >
      {/* Locations Table Section */}
      <section aria-labelledby='locations-heading' className='pb-10'>
        <h2 id='locations-heading' className='sr-only'>
          Game Locations
        </h2>
        <ErrorBoundary className='min-h-[70vh]'>
          <LocationTable />
        </ErrorBoundary>
      </section>
    </main>
  );
}

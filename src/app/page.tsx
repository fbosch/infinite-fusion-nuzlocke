import LocationList from '@/components/LocationList';

export default function Home() {
  return (
    <main
      id='main-content'
      className='max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8'
      role='main'
    >
      <section aria-labelledby='locations-heading' className='pb-10'>
        <h2 id='locations-heading' className='sr-only'>
          Game Locations
        </h2>
        <LocationList />
      </section>
    </main>
  );
}

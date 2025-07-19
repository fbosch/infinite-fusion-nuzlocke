import LocationList from '@/components/LocationList';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  return (
    <div className='bg-gray-50 dark:bg-gray-900 min-h-screen'>
      {/* Skip link for keyboard navigation */}
      <a
        href='#main-content'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-blue-600 text-white px-4 py-2 rounded-md z-50'
      >
        Skip to main content
      </a>

      <main id='main-content' className='max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8' role='main'>
        <header className='py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 mb-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center'>
        <figure className="w-14">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 186 143"><path fill="url(#a)" d="M42.9277 0c21.1611.00024419 39.9884 23.7749 53.3965 48.0635C109.725 23.7998 125.193.204198 146.347.204102c23.672 0 39.553 29.788398 39.553 66.653298C185.9 103.722 158.803 143 135.14 143c-21.154 0-36.1499-23.097-50.0228-48.3584-13.9885 25.4164-21.1056 39.0724-42.1895 39.0724C19.2565 133.714.00009288 103.722 0 66.8574 0 29.9925 19.2565 0 42.9277 0ZM142.973 24.3369c-15.399-.0115-27.529 19.6068-39.868 42.2764 12.556 23.0602 24.694 42.7887 39.868 42.7887 15.129 0 27.435-19.0714 27.435-42.5329 0-23.4485-12.306-42.5322-27.435-42.5322ZM35.9424 36.9668c-15.1275.0001-20.4512 6.4411-20.4512 29.8906.0001 23.4614 12.3089 42.5316 27.4365 42.5316 15.2515 0 20.4436-7.26 32.8828-30.1576-12.354-22.6462-24.4773-42.2646-39.8681-42.2646Z"/><path fill="#fff" d="M138.807 111.296c-.043-.395-.571-.395-.614 0l-.362 3.315c-.467 4.28-3.571 7.654-7.509 8.162l-3.049.393c-.364.047-.364.621 0 .668l3.049.393c3.938.508 7.042 3.882 7.509 8.162l.362 3.315c.043.395.571.395.614 0l.362-3.315c.467-4.28 3.571-7.654 7.509-8.162l3.049-.393c.364-.047.364-.621 0-.668l-3.049-.393c-3.938-.508-7.042-3.882-7.509-8.162l-.362-3.315ZM157.187 11.1897c-.026-.2529-.348-.2529-.374 0l-.22 2.1213c-.284 2.7391-2.174 4.8988-4.571 5.2238l-1.856.2517c-.221.03-.221.397 0 .427l1.856.2517c2.397.325 4.287 2.4847 4.571 5.2238l.22 2.1213c.026.2529.348.2529.374 0l.22-2.1213c.284-2.7391 2.174-4.8988 4.571-5.2238l1.856-.2517c.221-.03.221-.397 0-.427l-1.856-.2517c-2.397-.325-4.287-2.4847-4.571-5.2238l-.22-2.1213ZM33.6758 11.001c.0403-.3672.5329-.3672.5732 0l.3369 3.081c.436 3.9777 3.3312 7.1138 7.003 7.586l2.8447.3662c.3382.0441.3383.5761 0 .6201l-2.8447.3652c-3.672.4723-6.5672 3.6089-7.003 7.5869l-.3369 3.0811c-.0406.3666-.5326.3666-.5732 0l-.3369-3.0811c-.4357-3.978-3.331-7.1146-7.003-7.5869l-2.8447-.3652c-.3384-.044-.3383-.576 0-.6201l2.8447-.3662c3.6717-.4723 6.567-3.6083 7.003-7.586l.3369-3.081ZM145 72c0 28.719-23.281 52-52 52-28.7188 0-52-23.281-52-52 0-28.7188 23.2812-52 52-52 28.719 0 52 23.2812 52 52Z"/><path fill="#F2492B" fill-rule="evenodd" d="M106.38 69.0833 138 70c0-22.2754-21.967-44-45.4839-44C68.9995 26 48 47.7246 48 70l30.6527-.9167c0-7.2525 6.2068-13.1318 13.8634-13.1318 7.6569 0 13.8639 5.8793 13.8639 13.1318Z" clip-rule="evenodd"/><path stroke="#000" stroke-width="9" d="m44.5303 71.9229-.003-.0782C43.6 44.9501 66.1898 22.5 93.0156 22.5 119.713 22.5002 141.5 44.5812 141.5 72s-21.787 49.5-48.4844 49.5c-26.6973 0-48.4853-22.081-48.4853-49.5v-.0771Z"/><path fill="#000" d="M48 68h90v8H48z"/><circle cx="92.6154" cy="71.6154" r="19.5" fill="#fff" stroke="#000" stroke-width="8"/><defs><linearGradient id="a" x1="168.86" x2=".536007" y1="28.6" y2="67.9712" gradientUnits="userSpaceOnUse"><stop stop-color="#48FFFF"/><stop offset=".111111" stop-color="#88E6FF"/><stop offset=".222222" stop-color="#9FBFFF"/><stop offset=".333333" stop-color="#D5A1FF"/><stop offset=".444444" stop-color="#F392CD"/><stop offset=".555556" stop-color="#F3A9B0"/><stop offset=".666667" stop-color="#FACBB5"/><stop offset=".777778" stop-color="#FAE1AF"/><stop offset=".888889" stop-color="#F8F6C2"/><stop offset="1" stop-color="#BFFDB9"/></linearGradient></defs></svg>
        </figure>
        <h1 className="ml-4">
          <span className="block text-sm sm:text-lg font-bold text-cyan-500 dark:text-cyan-400">
            Pokémon Infinite Fusion
          </span>
          <span className="block text-lg sm:text-xl font-medium text-gray-900 dark:text-white">
            Nuzlocke Tracker
          </span>
        </h1>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <section aria-labelledby='locations-heading'>
          <h2 id='locations-heading' className='sr-only'>
            Game Locations
          </h2>
          <LocationList />
        </section>
      </main>
    </div>
  );
}

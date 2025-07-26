import { Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className='h-svh max-h-[75vh] flex items-center justify-center p-4'>
      <div className='text-center'>
        <h1 className='text-7xl font-bold text-gray-400 mb-4 font-mono'>404</h1>
        <h2 className='text-xl font-semibold mb-2'>Page Not Found</h2>
        <p className='text-gray-600 mb-6'>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href='/'
          className='inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700'
        >
          <Home className='h-4 w-4' />
          Go Home
        </Link>
      </div>
    </div>
  );
}

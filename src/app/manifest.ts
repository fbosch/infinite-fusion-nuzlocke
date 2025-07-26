import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Infinite Fusion Nuzlocke Tracker',
    short_name: 'IF Nuzlocke',
    description: 'Track your Pokémon Infinite Fusion Nuzlocke run',
    start_url: '/',
    display: 'standalone',
    background_color: '#1f2937',
    theme_color: '#1f2937',
    orientation: 'portrait-primary',
    scope: '/',
    categories: ['games', 'utilities'],
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}

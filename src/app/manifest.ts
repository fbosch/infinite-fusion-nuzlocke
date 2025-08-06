import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Infinite Fusion Nuzlocke Tracker',
    short_name: 'IF Nuzlocke',
    description:
      'Track your Pokémon Infinite Fusion Nuzlocke run with advanced features including fusion tracking, encounter management, and team building.',
    start_url: '/',
    display: 'standalone',
    background_color: '#1f2937',
    theme_color: '#1f2937',
    orientation: 'portrait-primary',
    scope: '/',
    categories: ['games', 'utilities'],
    lang: 'en',
    dir: 'ltr',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
        purpose: 'any',
      },
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon-96x96.png',
        sizes: '96x96',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    related_applications: [
      {
        platform: 'web',
        url: 'https://fusion.nuzlocke.io',
      },
    ],
    prefer_related_applications: false,
  };
}

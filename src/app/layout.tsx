import type { Metadata } from 'next';
import { Karla as Font } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { Providers } from './providers';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit';
import { CookieConsent } from '@/components/analytics/CookieConsent';
import {
  ConditionalAnalytics,
  ConditionalSpeedInsights,
} from '@/components/analytics/ConditionalAnalytics';

// Primary sans-serif font for body text
const font = Font({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '600', '700'],
  display: 'auto',
  variable: '--font-family-sans',
});

const dsFont = localFont({
  src: '../../public/pokemon-ds-font.woff2',
  variable: '--font-ds',
  display: 'block',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://fusion.nuzlocke.io'),
  title: {
    default: 'Infinite Fusion Nuzlocke Tracker',
    template: '%s | Infinite Fusion Nuzlocke Tracker',
  },
  description:
    'Track your Pokémon Infinite Fusion Nuzlocke runs with location-based encounters, multiple playthroughs, and Classic/Remix game modes.',
  keywords: [
    'Pokémon',
    'Infinite Fusion',
    'Nuzlocke',
    'tracker',
    'game',
    'locations',
    'team',
    'fusion',
    'Pokemon',
    'ROM hack',
    'challenge run',
    'gaming tool',
    'encounter tracking',
    'playthrough management',
  ],
  authors: [{ name: 'Frederik Bosch' }],
  creator: 'Frederik Bosch',
  publisher: 'Infinite Fusion Nuzlocke Tracker',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://fusion.nuzlocke.io',
    title: 'Infinite Fusion Nuzlocke Tracker',
    description:
      'Track your Pokémon Infinite Fusion Nuzlocke runs with location-based encounters, multiple playthroughs, and Classic/Remix game modes.',
    siteName: 'Infinite Fusion Nuzlocke Tracker',
    images: [
      {
        url: '/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'Infinite Fusion Nuzlocke Tracker Logo',
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification code
  },
  alternates: {
    canonical: 'https://fusion.nuzlocke.io',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang='en'
      suppressHydrationWarning
      className={`${font.variable} ${dsFont.variable}`}
    >
      <head>
        <meta name='theme-color' content='#1f2937' />
        <meta name='color-scheme' content='light dark' />
        <link rel='preconnect' href='https://infinitefusiondex.com' />
        <link rel='dns-prefetch' href='https://infinitefusiondex.com' />
        <link rel='preconnect' href='https://raw.githubusercontent.com' />
        <link rel='dns-prefetch' href='https://raw.githubusercontent.com' />
        <link rel='preconnect' href='https://infinitefusion.fandom.com' />
        <link rel='dns-prefetch' href='https://infinitefusion.fandom.com' />
        <link rel='preconnect' href='https://www.fusiondex.org' />
        <link rel='dns-prefetch' href='https://www.fusiondex.org' />
        <meta
          name='apple-mobile-web-app-title'
          content='Infinite Fusion Nuzlocke Tracker'
        />
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'
        />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'Infinite Fusion Nuzlocke Tracker',
              description:
                'Track your Pokémon Infinite Fusion Nuzlocke runs with location-based encounters, multiple playthroughs, and Classic/Remix game modes.',
              url: 'https://fusion.nuzlocke.io',
              applicationCategory: 'Game',
              operatingSystem: 'Web Browser',
              author: {
                '@type': 'Person',
                name: 'Frederik Bosch',
              },
              creator: {
                '@type': 'Person',
                name: 'Frederik Bosch',
              },
              offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD',
              },
              softwareVersion: '1.0.0',
              screenshot:
                'https://fusion.nuzlocke.io/android-chrome-512x512.png',
              featureList: [
                'Location-based encounter tracking',
                'Multiple playthrough management',
                'Classic and Remix game modes',
                'Custom location support',
                'Interactive location table',
                'Encounter history tracking',
                'Auto-scroll to recent encounters',
                'Responsive design for mobile and desktop',
              ],
            }),
          }}
        />
      </head>
      <body className='antialiased font-sans'>
        <Providers>
          <ErrorBoundary className='min-h-[100vh]'>
            <Header />
            {children}
            <Footer />
            <CookieConsent />
          </ErrorBoundary>
          <ConditionalAnalytics />
          <ConditionalSpeedInsights />
          <ServiceWorkerInit />
          {/* Portal root for context menus */}
          <div id='context-menu-root' />
        </Providers>
      </body>
    </html>
  );
}

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
  variable: '--font-mono',
  display: 'block',
});

export const metadata: Metadata = {
  title: 'Infinite Fusion Nuzlocke Tracker',
  description: 'Track your Pokémon Infinite Fusion Nuzlocke run',
  keywords:
    'Pokémon, Infinite Fusion, Nuzlocke, tracker, game, locations, team',
  authors: [{ name: 'Infinite Fusion Nuzlocke Tracker' }],
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

import type { Metadata } from 'next';
import { Be_Vietnam_Pro as Font } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit';
import { CookieConsent } from '@/components/cookies/CookieConsent';
import {
  ConditionalAnalytics,
  ConditionalSpeedInsights,
} from '@/components/ConditionalAnalytics';

// Primary sans-serif font for body text
const font = Font({
  subsets: ['latin'],
  weight: ['400', '800'],
  display: 'swap',
  variable: '--font',
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
        <link
          rel='icon'
          type='image/png'
          href='/favicon-96x96.png'
          sizes='96x96'
        />
        <link rel='icon' type='image/svg+xml' href='/favicon.svg' />
        <link rel='shortcut icon' href='/favicon.ico' />
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/apple-touch-icon.png'
        />
        <meta
          name='apple-mobile-web-app-title'
          content='Infinite Fusion Nuzlocke Tracker'
        />
      </head>
      <body className='antialiased font-sans'>
        <ThemeProvider>
          <ErrorBoundary className='min-h-[100vh]'>
            <Header />
            {children}
            <Footer />
            <CookieConsent />
          </ErrorBoundary>
        </ThemeProvider>
        <ConditionalAnalytics />
        <ConditionalSpeedInsights />
        <ServiceWorkerInit />
      </body>
    </html>
  );
}

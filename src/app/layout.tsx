import type { Metadata } from 'next';
import { Be_Vietnam_Pro as Font } from 'next/font/google';
import localFont from 'next/font/local';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import Header from '@/components/Header';
import { ServiceWorkerInit } from '@/components/ServiceWorkerInit';

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
});

export const metadata: Metadata = {
  title: 'Infinite Fusion Nuzlocke Tracker',
  description: 'Track your Pokémon Infinite Fusion Nuzlocke run',
  keywords:
    'Pokémon, Infinite Fusion, Nuzlocke, tracker, game, locations, team',
  authors: [{ name: 'Infinite Fusion Nuzlocke Tracker' }],
  viewport: 'width=device-width, initial-scale=1',
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
      </head>
      <body className='antialiased font-sans'>
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
        <ServiceWorkerInit />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { VT323 } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

// Initialize the VT323 font for monospace utility
const vt323 = VT323({
  subsets: ['latin'],
  weight: ['400'],
  display: 'swap',
  variable: '--font-vt323',
});

export const metadata: Metadata = {
  title: 'Infinite Fusion Nuzlocke Tracker',
  description:
    'Track your Pokémon Infinite Fusion Nuzlocke run with comprehensive location tracking, team management, and fusion mechanics.',
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
    <html lang='en' suppressHydrationWarning className={vt323.variable}>
      <head>
        <meta name='theme-color' content='#1f2937' />
        <meta name='color-scheme' content='light dark' />
      </head>
      <body className='antialiased'>
        <ThemeProvider>{children}</ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

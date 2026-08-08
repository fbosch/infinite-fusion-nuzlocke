import type { Metadata } from "next";
import { Karla as Font } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AnalyticsDebugPanel } from "@/components/analytics/AnalyticsDebugPanel";
import {
  ConditionalAnalytics,
  ConditionalSpeedInsights,
} from "@/components/analytics/ConditionalAnalytics";
import { CookieConsent } from "@/components/analytics/CookieConsent";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { ServiceWorkerInit } from "@/components/ServiceWorkerInit";
import { APP_TITLE, APP_TITLE_TEMPLATE } from "@/lib/metadata";
import { Providers } from "./providers";

// Primary sans-serif font for body text
const font = Font({
  display: "auto",
  subsets: ["latin"],
  variable: "--font-family-sans",
  weight: ["200", "300", "400", "500", "600", "700"],
});

const dsFont = localFont({
  display: "block",
  src: "../../public/pokemon-ds-font.woff2",
  variable: "--font-ds",
});

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  applicationCategory: "Game",
  author: {
    "@type": "Person",
    name: "Frederik Bosch",
  },
  creator: {
    "@type": "Person",
    name: "Frederik Bosch",
  },
  description:
    "Track your Pokémon Infinite Fusion Nuzlocke runs with location-based encounters, multiple playthroughs, and Classic/Remix game modes.",
  featureList: [
    "Location-based encounter tracking",
    "Multiple playthrough management",
    "Classic and Remix game modes",
    "Custom location support",
    "Interactive location table",
    "Encounter history tracking",
    "Auto-scroll to recent encounters",
    "Responsive design for mobile and desktop",
  ],
  name: "Infinite Fusion Nuzlocke Tracker",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  operatingSystem: "Web Browser",
  screenshot: "https://fusion.nuzlocke.io/android-chrome-512x512.png",
  softwareVersion: "1.0.0",
  url: "https://fusion.nuzlocke.io",
};

const REDUCED_MOTION_INITIALIZER = `
  try {
    const versioned = localStorage.getItem("settings:v1");
    const stored = versioned || localStorage.getItem("settings");
    const preference = stored ? JSON.parse(stored).reducedMotion : undefined;
    if (typeof preference === "boolean") {
      document.documentElement.dataset.reducedMotion = String(preference);
    }
  } catch (error) {}
`;

const STRUCTURED_DATA_JSON = JSON.stringify(STRUCTURED_DATA);

export const metadata: Metadata = {
  authors: [{ name: "Frederik Bosch" }],
  creator: "Frederik Bosch",
  description:
    "Track your Pokémon Infinite Fusion Nuzlocke runs with location-based encounters, multiple playthroughs, and Classic/Remix game modes.",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  keywords: [
    "Pokémon",
    "Infinite Fusion",
    "Nuzlocke",
    "tracker",
    "game",
    "locations",
    "team",
    "fusion",
    "Pokemon",
    "ROM hack",
    "challenge run",
    "gaming tool",
    "encounter tracking",
    "playthrough management",
  ],
  metadataBase: new URL("https://fusion.nuzlocke.io"),
  openGraph: {
    description:
      "Track your Pokémon Infinite Fusion Nuzlocke runs with location-based encounters, multiple playthroughs, and Classic/Remix game modes.",
    images: [
      {
        alt: "Infinite Fusion Nuzlocke Tracker Logo",
        height: 512,
        url: "/android-chrome-512x512.png",
        width: 512,
      },
    ],
    locale: "en_US",
    siteName: "Infinite Fusion Nuzlocke Tracker",
    title: "Infinite Fusion Nuzlocke Tracker",
    type: "website",
    url: "https://fusion.nuzlocke.io",
  },
  publisher: "Infinite Fusion Nuzlocke Tracker",
  robots: {
    follow: true,
    googleBot: {
      follow: true,
      index: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
    index: true,
  },
  title: {
    default: APP_TITLE,
    template: APP_TITLE_TEMPLATE,
  },
  verification: {
    google: "your-google-verification-code", // Add your Google Search Console verification code
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      className={`${font.variable} ${dsFont.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <head>
        <meta content="#1f2937" name="theme-color" />
        <meta content="light dark" name="color-scheme" />
        <link href="https://infinitefusiondex.com" rel="preconnect" />
        <link href="https://infinitefusiondex.com" rel="dns-prefetch" />
        <link href="https://raw.githubusercontent.com" rel="preconnect" />
        <link href="https://raw.githubusercontent.com" rel="dns-prefetch" />
        <link href="https://infinitefusion.fandom.com" rel="preconnect" />
        <link href="https://infinitefusion.fandom.com" rel="dns-prefetch" />
        <link href="https://www.fusiondex.org" rel="preconnect" />
        <link href="https://www.fusiondex.org" rel="dns-prefetch" />
        <meta
          content="Infinite Fusion Nuzlocke Tracker"
          name="apple-mobile-web-app-title"
        />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <script>{REDUCED_MOTION_INITIALIZER}</script>
        <script type="application/ld+json">{STRUCTURED_DATA_JSON}</script>
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <ErrorBoundary className="min-h-[100vh]">
            <Header />
            {children}
            <Footer />
            <CookieConsent />
          </ErrorBoundary>
          <ConditionalAnalytics />
          <ConditionalSpeedInsights />
          <AnalyticsDebugPanel />
          <ServiceWorkerInit />
          {/* Portal root for context menus */}
          <div id="context-menu-root" />
        </Providers>
      </body>
    </html>
  );
}

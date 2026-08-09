import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#1f2937",
    categories: ["games", "utilities"],
    description:
      "Track your Pokémon Infinite Fusion Nuzlocke run with advanced features including fusion tracking, encounter management, and team building.",
    dir: "ltr",
    display: "standalone",
    icons: [
      {
        purpose: "any",
        sizes: "any",
        src: "/favicon.ico",
        type: "image/x-icon",
      },
      {
        purpose: "any",
        sizes: "any",
        src: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        purpose: "any",
        sizes: "16x16",
        src: "/favicon-16x16.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "32x32",
        src: "/favicon-32x32.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "96x96",
        src: "/favicon-96x96.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "192x192",
        src: "/android-chrome-192x192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/android-chrome-512x512.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "180x180",
        src: "/apple-touch-icon.png",
        type: "image/png",
      },
    ],
    lang: "en",
    name: "Infinite Fusion Nuzlocke Tracker",
    orientation: "portrait-primary",
    prefer_related_applications: false,
    related_applications: [
      {
        platform: "web",
        url: "https://fusion.nuzlocke.io",
      },
    ],
    scope: "/",
    short_name: "PIF Nuzlocke",
    start_url: "/",
    theme_color: "#1f2937",
  };
}

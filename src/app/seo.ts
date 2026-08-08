import type { MetadataRoute } from "next";

export const SITE_URL = "https://fusion.nuzlocke.io";

type IndexableRoutePath = "/" | "/locations" | "/licenses";

interface IndexableRoute {
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  path: IndexableRoutePath;
  priority: number;
}

const INDEXABLE_ROUTES: readonly IndexableRoute[] = [
  {
    changeFrequency: "daily",
    path: "/",
    priority: 1,
  },
  {
    changeFrequency: "daily",
    path: "/locations",
    priority: 0.9,
  },
  {
    changeFrequency: "monthly",
    path: "/licenses",
    priority: 0.3,
  },
];

export const getIndexableRoutes = (): readonly IndexableRoute[] =>
  INDEXABLE_ROUTES;

export const getCanonicalUrl = (path: string): string =>
  new URL(path, SITE_URL).toString();

export const buildSitemapEntries = (
  lastModified: Date = new Date(),
): MetadataRoute.Sitemap =>
  INDEXABLE_ROUTES.map((route) => ({
    changeFrequency: route.changeFrequency,
    lastModified,
    priority: route.priority,
    url: getCanonicalUrl(route.path),
  }));

import type { MetadataRoute } from "next";

export const SITE_URL = "https://fusion.nuzlocke.io";

type IndexableRoutePath = "/" | "/locations" | "/licenses";

type IndexableRoute = {
  path: IndexableRoutePath;
  changeFrequency: NonNullable<
    MetadataRoute.Sitemap[number]["changeFrequency"]
  >;
  priority: number;
};

const INDEXABLE_ROUTES: readonly IndexableRoute[] = [
  {
    path: "/",
    changeFrequency: "daily",
    priority: 1,
  },
  {
    path: "/locations",
    changeFrequency: "daily",
    priority: 0.9,
  },
  {
    path: "/licenses",
    changeFrequency: "monthly",
    priority: 0.3,
  },
];

export const getIndexableRoutes = (): readonly IndexableRoute[] => {
  return INDEXABLE_ROUTES;
};

export const getCanonicalUrl = (path: string): string => {
  return new URL(path, SITE_URL).toString();
};

export const buildSitemapEntries = (
  lastModified: Date = new Date(),
): MetadataRoute.Sitemap => {
  return INDEXABLE_ROUTES.map((route) => ({
    url: getCanonicalUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
};

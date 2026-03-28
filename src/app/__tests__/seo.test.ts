import { describe, expect, it } from "vitest";
import {
  buildSitemapEntries,
  getCanonicalUrl,
  getIndexableRoutes,
  SITE_URL,
} from "../seo";

describe("seo sitemap strategy", () => {
  it("uses absolute canonical URLs", () => {
    expect(getCanonicalUrl("/")).toBe(`${SITE_URL}/`);
    expect(getCanonicalUrl("/locations")).toBe(`${SITE_URL}/locations`);
  });

  it("includes all indexable routes in the sitemap", () => {
    const fixedDate = new Date("2026-01-01T00:00:00.000Z");
    const sitemapEntries = buildSitemapEntries(fixedDate);

    expect(sitemapEntries).toHaveLength(getIndexableRoutes().length);

    for (const route of getIndexableRoutes()) {
      expect(sitemapEntries).toContainEqual(
        expect.objectContaining({
          url: getCanonicalUrl(route.path),
          changeFrequency: route.changeFrequency,
          priority: route.priority,
          lastModified: fixedDate,
        }),
      );
    }
  });
});

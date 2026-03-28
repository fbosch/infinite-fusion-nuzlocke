import type { MetadataRoute } from "next";
import { buildSitemapEntries } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries();
}

# SEO Canonical and Sitemap Strategy

This project uses a single source of truth for indexable pages in `src/app/seo.ts`.

## Canonical rules

- Use absolute canonicals derived from `SITE_URL` through `getCanonicalUrl`.
- Every indexable page must define `metadata.alternates.canonical`.
- Root layout does not set a global canonical, so each route can declare its own canonical target.

## Sitemap rules

- Sitemap entries are generated via `buildSitemapEntries` in `src/app/sitemap.ts`.
- Only indexable content routes belong in the sitemap.
- Every sitemap entry must include:
  - absolute `url`
  - `lastModified`
  - `changeFrequency`
  - `priority`

## Robots and indexing

- `public/robots.txt` points crawlers to `/sitemap.xml`.
- API and internal runtime paths (`/api`, `/_next`) remain disallowed.

## Adding new content routes

When a new route should be indexable:

1. Add it to `INDEXABLE_ROUTES` in `src/app/seo.ts`.
2. Add route metadata with the canonical path.
3. Update `src/app/__tests__/seo.test.ts` only if strategy rules change.
4. Verify in Search Console after deployment using the sitemap URL.

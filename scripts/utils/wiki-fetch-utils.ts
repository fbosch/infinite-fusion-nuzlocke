const WIKI_ORIGIN = "https://infinitefusion.fandom.com";
const WIKI_API_URL = `${WIKI_ORIGIN}/api.php`;
const SCRAPER_USER_AGENT =
  "InfiniteFusionNuzlockeScraper/1.0 (+https://github.com/fbb/infinite-fusion-nuzlocke)";

type WikiParseResponse = {
  parse?: {
    text?: string;
    title?: string;
  };
  error?: {
    code?: string;
    info?: string;
  };
};

function getPageTitleFromUrl(pageUrl: string): string {
  const parsed = new URL(pageUrl);

  if (parsed.origin !== WIKI_ORIGIN) {
    throw new Error(`Unsupported wiki origin: ${parsed.origin}`);
  }

  const wikiPathPrefix = "/wiki/";
  if (parsed.pathname.startsWith(wikiPathPrefix) === false) {
    throw new Error(`Unsupported wiki path: ${parsed.pathname}`);
  }

  const rawTitle = decodeURIComponent(
    parsed.pathname.slice(wikiPathPrefix.length),
  );
  const normalizedTitle = rawTitle
    .replace(/\/+$/, "")
    .replace(/_/g, " ")
    .trim();

  if (normalizedTitle.length === 0) {
    throw new Error(`Invalid wiki page URL: ${pageUrl}`);
  }

  return normalizedTitle;
}

export async function fetchWikiPageHtml(pageUrl: string): Promise<string> {
  const pageTitle = getPageTitleFromUrl(pageUrl);
  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    formatversion: "2",
    prop: "text",
    page: pageTitle,
  });

  const response = await fetch(`${WIKI_API_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": SCRAPER_USER_AGENT,
    },
  });

  if (response.ok === false) {
    throw new Error(
      `Wiki API request failed (${response.status}) for page: ${pageTitle}`,
    );
  }

  const payload = (await response.json()) as WikiParseResponse;

  if (payload.error) {
    const code = payload.error.code ?? "unknown";
    const info = payload.error.info ?? "Unknown wiki API error";
    throw new Error(
      `Wiki API parse error (${code}) for page ${pageTitle}: ${info}`,
    );
  }

  const html = payload.parse?.text;
  if (typeof html !== "string" || html.length === 0) {
    throw new Error(
      `Wiki API returned empty parsed content for page: ${pageTitle}`,
    );
  }

  return html;
}

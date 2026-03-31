const WIKI_ORIGIN = "https://infinitefusion.fandom.com";
const WIKI_API_URL = `${WIKI_ORIGIN}/api.php`;
const WIKI_API_TIMEOUT_MS = 10_000;
const SCRAPER_USER_AGENT =
  "InfiniteFusionNuzlockeScraper/1.0 (+https://github.com/fbb/infinite-fusion-nuzlocke)";

type WikiParseResponse = {
  parse?: {
    text?: string;
    wikitext?: string;
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

  let rawTitle: string;
  try {
    rawTitle = decodeURIComponent(parsed.pathname.slice(wikiPathPrefix.length));
  } catch (error) {
    throw new Error(
      `Invalid wiki page URL encoding for ${pageUrl}: ${error instanceof Error ? error.message : "unknown decode error"}`,
    );
  }
  const normalizedTitle = rawTitle
    .replace(/\/+$/, "")
    .replace(/_/g, " ")
    .trim();

  if (normalizedTitle.length === 0) {
    throw new Error(`Invalid wiki page URL: ${pageUrl}`);
  }

  return normalizedTitle;
}

async function fetchWikiPageParsedContent(
  pageUrl: string,
  prop: "text" | "wikitext",
): Promise<string> {
  const pageTitle = getPageTitleFromUrl(pageUrl);
  const params = new URLSearchParams({
    action: "parse",
    format: "json",
    formatversion: "2",
    prop,
    page: pageTitle,
    redirects: "1",
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), WIKI_API_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${WIKI_API_URL}?${params.toString()}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": SCRAPER_USER_AGENT,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Wiki API request timed out after ${WIKI_API_TIMEOUT_MS}ms for page: ${pageTitle}`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

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

  const parsedContent =
    prop === "text" ? payload.parse?.text : payload.parse?.wikitext;
  if (typeof parsedContent !== "string" || parsedContent.length === 0) {
    throw new Error(
      `Wiki API returned empty ${prop} content for page: ${pageTitle}`,
    );
  }

  return parsedContent;
}

export async function fetchWikiPageHtml(pageUrl: string): Promise<string> {
  return fetchWikiPageParsedContent(pageUrl, "text");
}

export async function fetchWikiPageWikitext(pageUrl: string): Promise<string> {
  return fetchWikiPageParsedContent(pageUrl, "wikitext");
}

/**
 * API client with automatic cache busting via build ID
 */
import { getCacheBuster } from '@/lib/persistence';

/**
 * Fetch with automatic cache busting query parameter
 */
export async function fetchWithCacheBusting(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const buildId = getCacheBuster().toString();
  const separator = url.includes('?') ? '&' : '?';
  const urlWithVersion = `${url}${separator}v=${encodeURIComponent(buildId)}`;

  return fetch(urlWithVersion, options);
}

/**
 * Create API URL with cache busting
 */
export function createApiUrl(
  path: string,
  params?: Record<string, string>
): string {
  const url = new URL(path, window.location.origin);

  // Add existing params
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  // Add cache busting version
  url.searchParams.set('v', getCacheBuster().toString());

  return url.toString();
}

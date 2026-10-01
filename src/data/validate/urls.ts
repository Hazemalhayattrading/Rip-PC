/** Hosts of web archives and caches. A `url` on one of these is never a valid source URL. */
export const ARCHIVE_HOSTS = [
  'web.archive.org',
  'archive.org',
  'wayback.archive.org',
  'archive.today',
  'archive.ph',
  'archive.is',
  'archive.li',
  'archive.vn',
  'archive.md',
  'archive.fo',
  'ghostarchive.org',
  'webcache.googleusercontent.com',
  'cachedview.nl',
  'timetravel.mementoweb.org',
] as const;

export function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** True when `host` is `domain` or a subdomain of it. */
export function hostMatches(host: string, domain: string): boolean {
  return host === domain || host.endsWith(`.${domain}`);
}

export function isArchiveUrl(url: string): boolean {
  const host = hostOf(url);
  return host !== null && ARCHIVE_HOSTS.some((d) => hostMatches(host, d));
}

export interface WaybackSnapshot {
  /** Snapshot date as YYYY-MM-DD (UTC), from the 14-digit timestamp. */
  date: string;
  timestamp: string;
  original: string;
}

/**
 * Parses `https://web.archive.org/web/<YYYYMMDDhhmmss>[flag_]/<original url>`.
 * Returns null for anything else, including snapshots without a full 14-digit timestamp.
 */
export function parseWayback(archiveUrl: string): WaybackSnapshot | null {
  const m = /^https:\/\/web\.archive\.org\/web\/(\d{14})(?:[a-z]{2}_)?\/(.+)$/.exec(archiveUrl);
  if (!m) return null;
  const [, timestamp, original] = m;
  if (timestamp === undefined || original === undefined) return null;
  const date = `${timestamp.slice(0, 4)}-${timestamp.slice(4, 6)}-${timestamp.slice(6, 8)}`;
  if (Number.isNaN(Date.parse(`${date}T00:00:00Z`))) return null;
  return { date, timestamp, original };
}

/** Normalises a URL for "same page" comparison: no scheme, no `www.`, no trailing slash, no fragment. */
export function normaliseUrl(url: string): string {
  const withScheme = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`;
  try {
    const u = new URL(withScheme);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}${u.search}`;
  } catch {
    return url;
  }
}

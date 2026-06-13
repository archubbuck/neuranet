/**
 * Reddit thread fetcher using the public JSON API.
 * No authentication required for public threads.
 *
 * Usage:
 *   import { fetchThread } from './reddit-fetcher';
 *   const data = await fetchThread('https://www.reddit.com/r/.../comments/.../...');
 *   // => { threadId, title, body, comments: Array<{body, depth}> }
 */

export interface RedditComment {
  body: string;
  depth: number;
}

export interface RedditThread {
  threadId: string;
  title: string;
  body: string;
  comments: RedditComment[];
}

/**
 * Normalize a Reddit URL to the JSON API endpoint.
 * Accepts: reddit.com, www.reddit.com, old.reddit.com
 * Returns: https://www.reddit.com/r/<sub>/comments/<id>/<slug>.json
 */
export function normalizeUrl(rawUrl: string): string {
  let url = rawUrl.trim();

  // Strip trailing slashes and .json if present
  url = url.replace(/\/+$/, '');
  url = url.replace(/\.json$/, '');

  // Ensure protocol
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  // Parse the URL
  const parsed = new URL(url);

  // Validate it's a genuine Reddit host. An exact-match allowlist (plus
  // `.reddit.com` subdomains) prevents SSRF bypasses like
  // `malicious-reddit.com`, which would pass a naive endsWith check.
  const hostname = parsed.hostname.toLowerCase();
  const isReddit = hostname === 'reddit.com' || hostname.endsWith('.reddit.com');
  if (!isReddit) {
    throw new Error('Not a Reddit URL');
  }

  // Normalize hostname to www.reddit.com
  parsed.hostname = 'www.reddit.com';

  // Append .json
  parsed.pathname = parsed.pathname.replace(/\/+$/, '') + '.json';

  return parsed.toString();
}

/**
 * Extract the Reddit thread ID from a URL.
 */
export function extractThreadId(url: string): string {
  const match = url.match(/\/comments\/([a-z0-9]+)/i);
  if (!match) {
    throw new Error('Could not extract thread ID from URL');
  }
  return match[1]!;
}

/**
 * Flatten a Reddit comment tree into a flat array of comment bodies.
 * Each entry: { body: string, depth: number }
 */
export function flattenComments(commentData: unknown, depth = 0, maxDepth = 3): RedditComment[] {
  if (!commentData) return [];
  const results: RedditComment[] = [];

  // commentData can be an object or an array from the "children" of a "Listing"
  const children: unknown[] = Array.isArray(commentData)
    ? commentData
    : ((commentData as { data?: { children?: unknown[] } }).data?.children ?? []);

  for (const child of children as Array<{
    kind?: string;
    data?: { body?: string; replies?: { data?: { children?: unknown[] } } };
  }>) {
    if (child.kind !== 't1') continue; // skip "more" links etc.

    const data = child.data;
    if (!data || !data.body) continue;

    results.push({ body: data.body, depth });

    if (depth < maxDepth && data.replies && data.replies.data) {
      results.push(...flattenComments(data.replies.data.children, depth + 1, maxDepth));
    }
  }

  return results;
}

/**
 * Fetch and parse a Reddit thread.
 */
export async function fetchThread(rawUrl: string): Promise<RedditThread> {
  const apiUrl = normalizeUrl(rawUrl);
  const threadId = extractThreadId(rawUrl);

  const response = await fetch(apiUrl, {
    headers: {
      'User-Agent': 'neuranet/1.0 (educational project)',
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Thread not found (404)');
    }
    if (response.status === 429) {
      throw new Error('Reddit rate limit reached — try again later');
    }
    throw new Error(`Reddit API returned status ${response.status}`);
  }

  const data = (await response.json()) as unknown;

  // Reddit returns an array: [postListing, commentsListing]
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error('Unexpected Reddit API response structure');
  }

  const postData = (
    data[0] as { data?: { children?: Array<{ data?: { title?: string; selftext?: string } }> } }
  )?.data?.children?.[0]?.data;
  if (!postData) {
    throw new Error('Could not parse thread post data');
  }

  const title = postData.title || '(untitled)';
  const body = postData.selftext || '';

  // Parse comments
  const comments = flattenComments(
    (data[1] as { data?: { children?: unknown[] } })?.data?.children,
    0,
  );

  return { threadId, title, body, comments };
}

/**
 * Mutable shared module facade. Routes call `fetcher.fetchThread(...)`
 * rather than the bare import so tests can swap in mock implementations
 * without resorting to a full ESM mocking system.
 */
export const fetcher = {
  fetchThread,
  normalizeUrl,
  extractThreadId,
  flattenComments,
};

export default fetcher;

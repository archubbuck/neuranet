/**
 * Web page fetcher — fetches a URL and extracts title + body text.
 * No external HTML parser required: uses native fetch and simple
 * regex-based extraction from raw HTML.
 *
 * Usage:
 *   import { fetchWebPage } from './web-fetcher';
 *   const data = await fetchWebPage('https://example.com/article');
 *   // => { title: string; body: string }
 */

export interface WebPage {
  title: string;
  body: string;
}

/**
 * Strip HTML tags and decode common entities, returning plain text.
 */
function stripHtml(html: string): string {
  return (
    html
      // Remove scripts, styles, and other non-content elements
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
      .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
      // Replace block-level elements with newlines
      .replace(
        /<\/(?:p|div|h[1-6]|li|tr|article|section|aside|header|footer|main|nav|blockquote|pre|br)[^>]*>/gi,
        '\n',
      )
      .replace(/<(?:br|hr)[^>]*\/?>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode common entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&#(\d+);/g, (_m, d) => String.fromCharCode(Number(d)))
      .replace(/&nbsp;/g, ' ')
      // Collapse whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

/**
 * Extract the title from an HTML document.
 */
function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (match?.[1]) {
    return stripHtml(match[1]).trim().substring(0, 300);
  }

  // Try Open Graph title
  const ogMatch =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i) ??
    html.match(/<meta[^>]+content="([^"]*)"[^>]+property="og:title"/i);
  if (ogMatch?.[1]) {
    return ogMatch[1].trim().substring(0, 300);
  }

  return 'Untitled';
}

/**
 * Fetch a web page and extract its title and plain-text body.
 * Tries direct fetch first; falls back to a content-extraction proxy
 * if the site returns 403 (bot protection).
 */
export async function fetchWebPage(rawUrl: string): Promise<WebPage> {
  const url = rawUrl.trim();
  if (!url.startsWith('http')) {
    throw new Error('URL must start with http:// or https://');
  }

  // ── Attempt 1: direct fetch ──
  try {
    return await fetchDirect(url);
  } catch (err) {
    if (err instanceof Error && err.message.includes('403')) {
      // ── Attempt 2: Jina Reader proxy (free, no key required) ──
      try {
        return await fetchViaJina(url);
      } catch {
        // Re-throw original error if fallback also fails
        throw err;
      }
    }
    throw err;
  }
}

async function fetchDirect(url: string): Promise<WebPage> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    redirect: 'follow',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Page not found (404)');
    }
    if (response.status === 403) {
      throw new Error('Access denied (403) — the site may block automated requests');
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error(`Unsupported content type: ${contentType}. Only HTML pages are supported.`);
  }

  const html = await response.text();
  const title = extractTitle(html);
  const body = stripHtml(html);

  if (!body || body.length < 50) {
    throw new Error('Could not extract meaningful text from the page');
  }

  return { title, body };
}

/** Fallback: use Jina Reader API to extract clean text from any URL. */
async function fetchViaJina(url: string): Promise<WebPage> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const response = await fetch(jinaUrl, {
    headers: {
      Accept: 'text/markdown',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    throw new Error(`Jina proxy returned HTTP ${response.status}`);
  }

  const markdown = await response.text();

  // Jina returns markdown with a title line like "Title: ...\n\n"
  const titleMatch = markdown.match(/^Title:\s*(.+)$/m);
  const title = titleMatch?.[1]?.trim() || 'Untitled';

  // Remove the Jina header block (everything before the first Markdown heading or URL line)
  const bodyStart = markdown.search(/^https?:\/\//m);
  const body = bodyStart >= 0 ? markdown.slice(bodyStart).trim() : markdown;

  if (!body || body.length < 50) {
    throw new Error('Could not extract meaningful text from the page via Jina proxy');
  }

  return { title, body };
}

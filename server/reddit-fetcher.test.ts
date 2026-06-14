/**
 * SSRF guard tests for the Reddit URL normalizer.
 */
import { describe, expect, it } from 'vitest';
import { normalizeUrl } from './reddit-fetcher';

describe('normalizeUrl SSRF guard', () => {
  it.each([
    'https://www.reddit.com/r/science/comments/abc123/title/',
    'https://old.reddit.com/r/science/comments/abc123/title',
    'https://reddit.com/r/science/comments/abc123/title',
    'reddit.com/r/science/comments/abc123/title',
  ])('accepts legitimate reddit URL %s', (url) => {
    const out = normalizeUrl(url);
    expect(out).toContain('https://www.reddit.com/');
    expect(out.endsWith('.json')).toBe(true);
  });

  it.each([
    'https://malicious-reddit.com/r/x/comments/abc/t', // endsWith bypass
    'https://evilreddit.com/r/x/comments/abc/t',
    'https://reddit.com.evil.example/r/x/comments/abc/t',
    'https://example.com/r/x/comments/abc/t',
    'http://169.254.169.254/latest/meta-data/',
  ])('rejects non-reddit host %s', (url) => {
    expect(() => normalizeUrl(url)).toThrow(/not a reddit url/i);
  });
});

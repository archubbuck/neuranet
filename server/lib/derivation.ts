/**
 * Keyword/topic derivation helpers — pure functions, no DB access.
 */
const STOPWORDS = new Set([
  'about',
  'above',
  'after',
  'again',
  'against',
  'almost',
  'also',
  'among',
  'and',
  'another',
  'any',
  'are',
  'around',
  'because',
  'been',
  'before',
  'being',
  'below',
  'between',
  'both',
  'but',
  'can',
  'cannot',
  'could',
  'data',
  'does',
  'done',
  'each',
  'either',
  'enough',
  'from',
  'have',
  'into',
  'its',
  'just',
  'like',
  'many',
  'more',
  'most',
  'much',
  'must',
  'need',
  'only',
  'other',
  'our',
  'over',
  'same',
  'should',
  'some',
  'such',
  'than',
  'that',
  'the',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'those',
  'through',
  'under',
  'using',
  'very',
  'was',
  'were',
  'what',
  'when',
  'which',
  'while',
  'with',
  'within',
  'would',
  'your',
]);

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function titleCase(value: string): string {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function colorFromSlug(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 62%)`;
}

export function topKeywords(text: string, maxCount: number): string[] {
  const counts = new Map<string, number>();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([token]) => token);
}

export function scoreTopicMatch(tokens: Set<string>, topicLabel: string): number {
  const topicTokens = tokenize(topicLabel);
  let score = 0;
  for (const token of topicTokens) {
    if (tokens.has(token)) {
      score += 2;
    }
    for (const candidate of tokens) {
      if (candidate.startsWith(token) || token.startsWith(candidate)) {
        score += 1;
      }
    }
  }
  return score;
}

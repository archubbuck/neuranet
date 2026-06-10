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

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function tokenize(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function titleCase(value) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function colorFromSlug(slug) {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 62%)`;
}

function topKeywords(text, maxCount) {
  const counts = new Map();
  for (const token of tokenize(text)) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxCount)
    .map(([token]) => token);
}

function scoreTopicMatch(tokens, topicLabel) {
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

module.exports = { slugify, tokenize, titleCase, colorFromSlug, topKeywords, scoreTopicMatch };

const STOP = new Set([
  'the', 'a', 'an', 'is', 'in', 'on', 'at', 'of', 'and', 'to', 'for',
  'near', 'by', 'this', 'that', 'it', 'there', 'was', 'has', 'have',
  'be', 'my', 'our', 'very'
]);

/**
 * Tokenizes text into a set of meaningful words
 * - Converts to lowercase
 * - Removes punctuation and special characters
 * - Splits on whitespace
 * - Filters out stopwords and short words (< 3 chars)
 * @param {string} text - Input text to tokenize
 * @returns {Set<string>} Set of meaningful tokens
 */
function tokenize(text) {
  return new Set(
    String(text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP.has(w))
  );
}

/**
 * Calculates Jaccard similarity between two sets
 * Jaccard(A,B) = |A ∩ B| / |A ∪ B|
 * @param {Set<any>} a - First set
 * @param {Set<any>} b - Second set
 * @returns {number} Similarity score between 0 and 1
 */
function jaccard(a, b) {
  if (!a.size || !b.size) return 0;

  let inter = 0;
  for (const w of a) {
    if (b.has(w)) inter++;
  }

  const union = a.size + b.size - inter;
  return inter / union;
}

/**
 * Scores candidates against a query text using Jaccard similarity
 * @param {string} queryText - The query text to match against
 * @param {Array} candidates - Array of candidate objects with title and description
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Minimum score to include (default: 0.18)
 * @param {number} options.limit - Maximum results to return (default: 5)
 * @returns {Array} Array of { issue: candidate, score: number } objects
 */
function scoreCandidates(queryText, candidates, { threshold = parseFloat(process.env.SIMILAR_THRESHOLD) || 0.18, limit = 5 } = {}) {
  const q = tokenize(queryText);
  return candidates
    .map(c => ({
      issue: c,
      score: jaccard(q, tokenize(`${c.title} ${c.description}`))
    }))
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

module.exports = { tokenize, jaccard, scoreCandidates };

// ponytail: Jaccard over ≤50 geo-filtered candidates, in-process, no index.
// Upgrade to Atlas Search or embeddings only if recall is visibly bad in the demo.
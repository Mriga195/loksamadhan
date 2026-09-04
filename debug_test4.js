// Test what happens WITHOUT stopword removal

function tokenizeWithoutStopwords(text) {
  return new Set(
    String(text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)  // Only filter short words, not stopwords
  );
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) {
    if (b.has(w)) inter++;
  }
  const union = a.size + b.size - inter;
  return inter / union;
}

function scoreCandidatesWithoutStopwords(queryText, candidates, { threshold = 0.18, limit = 5 } = {}) {
  const q = tokenizeWithoutStopwords(queryText);
  return candidates
    .map(c => ({
      issue: c,
      score: jaccard(q, tokenizeWithoutStopwords(`${c.title} ${c.description}`))
    }))
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Example from LANE-4-dedup.md
const query1 = "the water is in a bad state on the road";
const query2 = "the road is in a bad state";

console.log('=== Testing WITHOUT stopword removal ===');
console.log('Query 1:', query1);
console.log('Query 2:', query2);

const tokens1 = tokenizeWithoutStopwords(query1);
const tokens2 = tokenizeWithoutStopwords(query2);
console.log('Tokens 1 (first 20):', [...tokens1].slice(0, 20));
console.log('Tokens 2 (first 20):', [...tokens2].slice(0, 20));

const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
console.log('Intersection size:', intersection.size);

const union = new Set([...tokens1, ...tokens2]);
console.log('Union size:', union.size);

const manualJaccard = intersection.size / union.size;
console.log('Manual Jaccard:', manualJaccard);

const computedJaccard = jaccard(tokens1, tokens2);
console.log('Computed Jaccard:', computedJaccard);

const results = scoreCandidatesWithoutStopwords(query1, [makeIssue(query2, "")], { threshold: 0.18, limit: 1 });
console.log('ScoreCandidates result:', results.length > 0 ? results[0].score : 'No match');

function makeIssue(title, description) {
  return { title, description };
}

console.log('');
console.log('=== Testing WITH stopword removal (our current implementation) ===');
const { tokenize, jaccard: jaccardWithStopwords, scoreCandidates } = require('./server/lib/similar');

const tokens1With = tokenize(query1);
const tokens2With = tokenize(query2);
console.log('Tokens 1 with stopwords:', [...tokens1With]);
console.log('Tokens 2 with stopwords:', [...tokens2With]);

const intersectionWith = new Set([...tokens1With].filter(x => tokens2With.has(x)));
console.log('Intersection size with stopwords:', intersectionWith.size);

const unionWith = new Set([...tokens1With, ...tokens2With]);
console.log('Union size with stopwords:', unionWith.size);

const manualJaccardWith = intersectionWith.size / unionWith.size;
console.log('Manual Jaccard with stopwords:', manualJaccardWith);

const computedJaccardWith = jaccardWithStopwords(tokens1With, tokens2With);
console.log('Computed Jaccard with stopwords:', computedJaccardWith);

const resultsWith = scoreCandidates(query1, [makeIssue(query2, "")], { threshold: 0.18, limit: 1 });
console.log('ScoreCandidates result with stopwords:', resultsWith.length > 0 ? resultsWith[0].score : 'No match');
const { tokenize, jaccard, scoreCandidates } = require('./server/lib/similar');
const STOP = new Set([
  'the', 'a', 'an', 'is', 'in', 'on', 'at', 'of', 'and', 'to', 'for',
  'near', 'by', 'this', 'that', 'it', 'there', 'was', 'has', 'have',
  'be', 'my', 'our', 'very'
]);

function makeIssue(title, description) {
  return { title, description };
}

// Alternative interpretation of the example
const query1 = "the water is in a bad state";
const query2 = "the road is in a bad state";

console.log('=== Testing alternative interpretation ===');
console.log('Query 1:', query1);
console.log('Query 2:', query2);

const tokens1 = tokenize(query1);
const tokens2 = tokenize(query2);
console.log('Tokens 1:', [...tokens1]);
console.log('Tokens 2:', [...tokens2]);

const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
console.log('Intersection:', [...intersection]);
console.log('Intersection size:', intersection.size);

const union = new Set([...tokens1, ...tokens2]);
console.log('Union:', [...union]);
console.log('Union size:', union.size);

const manualJaccard = intersection.size / union.size;
console.log('Manual Jaccard:', manualJaccard);

const computedJaccard = jaccard(tokens1, tokens2);
console.log('Computed Jaccard:', computedJaccard);

const results = scoreCandidates(query1, [makeIssue(query2, "")], { threshold: 0.18, limit: 1 });
console.log('ScoreCandidates result:', results.length > 0 ? results[0].score : 'No match');

console.log('');
console.log('=== What if we consider ONLY stopwords? ===');

// Extract just the stopwords from each
function extractStopwords(text) {
  const words = String(text || '').toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/);
  return new Set(words.filter(w => STOP.has(w)));
}

const stopwords1 = extractStopwords(query1);
const stopwords2 = extractStopwords(query2);
console.log('Stopwords 1:', [...stopwords1]);
console.log('Stopwords 2:', [...stopwords2]);

const stopwordIntersection = new Set([...stopwords1].filter(x => stopwords2.has(x)));
console.log('Stopword intersection:', [...stopwordIntersection]);
console.log('Stopword intersection size:', stopwordIntersection.size);

if (stopwordIntersection.size > 0) {
  const stopwordUnion = new Set([...stopwords1, ...stopwords2]);
  const stopwordJaccard = stopwordIntersection.size / stopwordUnion.size;
  console.log('Stopword Jaccard:', stopwordJaccard);
} else {
  console.log('No stopword overlap - Jaccard would be 0');
}
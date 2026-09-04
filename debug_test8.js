const { tokenize, jaccard, scoreCandidates } = require('./server/lib/similar');

function makeIssue(title, description) {
  return { title, description };
}

// Test case for TRUE stopword-only overlap
const query1 = "the water is in the tank";
const query2 = "the road is in the state";

console.log('=== Testing TRUE stopword-only overlap case ===');
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

// Now let's see what the scores would be WITHOUT stopword removal
function tokenizeNoStop(text) {
  return new Set(
    String(text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

function jaccardNoStop(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const w of a) {
    if (b.has(w)) inter++;
  }
  const union = a.size + b.size - inter;
  return inter / union;
}

const tokens1NoStop = tokenizeNoStop(query1);
const tokens2NoStop = tokenizeNoStop(query2);
console.log('\\n=== Without stopword removal ===');
console.log('Tokens 1 (no stop):', [...tokens1NoStop]);
console.log('Tokens 2 (no stop):', [...tokens2NoStop]);

const intersectionNoStop = new Set([...tokens1NoStop].filter(x => tokens2NoStop.has(x)));
console.log('Intersection (no stop):', [...intersectionNoStop]);
console.log('Intersection size (no stop):', intersectionNoStop.size);

const unionNoStop = new Set([...tokens1NoStop, ...tokens2NoStop]);
console.log('Union (no stop):', [...unionNoStop]);
console.log('Union size (no stop):', unionNoStop.size);

const manualJaccardNoStop = intersectionNoStop.size / unionNoStop.size;
console.log('Manual Jaccard (no stop):', manualJaccardNoStop);

const computedJaccardNoStop = jaccardNoStop(tokens1NoStop, tokens2NoStop);
console.log('Computed Jaccard (no stop):', computedJaccardNoStop);

console.log('');
console.log('=== Summary ===');
console.log(`With stopword removal:    ${manualJaccard.toFixed(2)}`);
console.log(`Without stopword removal: ${manualJaccardNoStop.toFixed(2)}`);
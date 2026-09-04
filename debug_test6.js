const { tokenize, jaccard: jaccardWithStop, scoreCandidates: scoreCandidatesWithStop } = require('./server/lib/similar');
const STOP = new Set([
  'the', 'a', 'an', 'is', 'in', 'on', 'at', 'of', 'and', 'to', 'for',
  'near', 'by', 'this', 'that', 'it', 'there', 'was', 'has', 'have',
  'be', 'my', 'our', 'very'
]);

function makeIssue(title, description) {
  return { title, description };
}

// Tokenize WITHOUT removing stopwords (but still removing short words and punctuation)
function tokenizeNoStopFilter(text) {
  return new Set(
    String(text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)  // Only filter short words, not stopwords
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

function scoreCandidatesNoStopFilter(queryText, candidates, { threshold = 0.18, limit = 5 } = {}) {
  const q = tokenizeNoStopFilter(queryText);
  return candidates
    .map(c => ({
      issue: c,
      score: jaccardNoStop(q, tokenizeNoStopFilter(`${c.title} ${c.description}`))
    }))
    .filter(x => x.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// Example from LANE-4-dedup.md
const query1 = "the water is in a bad state on the road";
const query2 = "the road is in a bad state";

console.log('=== Testing WITHOUT stopword removal (but still filtering short words) ===');
console.log('Query 1:', query1);
console.log('Query 2:', query2);

const tokens1NoStop = tokenizeNoStopFilter(query1);
const tokens2NoStop = tokenizeNoStopFilter(query2);
console.log('Tokens 1 (no stop filter):', [...tokens1NoStop]);
console.log('Tokens 2 (no stop filter):', [...tokens2NoStop]);

const intersectionNoStop = new Set([...tokens1NoStop].filter(x => tokens2NoStop.has(x)));
console.log('Intersection (no stop filter):', [...intersectionNoStop]);
console.log('Intersection size (no stop filter):', intersectionNoStop.size);

const unionNoStop = new Set([...tokens1NoStop, ...tokens2NoStop]);
console.log('Union (no stop filter):', [...unionNoStop]);
console.log('Union size (no stop filter):', unionNoStop.size);

const manualJaccardNoStop = intersectionNoStop.size / unionNoStop.size;
console.log('Manual Jaccard (no stop filter):', manualJaccardNoStop);

const computedJaccardNoStop = jaccardNoStop(tokens1NoStop, tokens2NoStop);
console.log('Computed Jaccard (no stop filter):', computedJaccardNoStop);

const resultsNoStop = scoreCandidatesNoStopFilter(query1, [makeIssue(query2, "")], { threshold: 0.18, limit: 1 });
console.log('ScoreCandidates result (no stop filter):', resultsNoStop.length > 0 ? resultsNoStop[0].score : 'No match');

console.log('');
console.log('=== Testing WITH stopword removal (our current implementation) ===');

const tokens1WithStop = tokenize(query1);
const tokens2WithStop = tokenize(query2);
console.log('Tokens 1 (with stop filter):', [...tokens1WithStop]);
console.log('Tokens 2 (with stop filter):', [...tokens2WithStop]);

const intersectionWithStop = new Set([...tokens1WithStop].filter(x => tokens2WithStop.has(x)));
console.log('Intersection (with stop filter):', [...intersectionWithStop]);
console.log('Intersection size (with stop filter):', intersectionWithStop.size);

const unionWithStop = new Set([...tokens1WithStop, ...tokens2WithStop]);
console.log('Union (with stop filter):', [...unionWithStop]);
console.log('Union size (with stop filter):', unionWithStop.size);

const manualJaccardWithStop = intersectionWithStop.size / unionWithStop.size;
console.log('Manual Jaccard (with stop filter):', manualJaccardWithStop);

const computedJaccardWithStop = jaccardWithStop(tokens1WithStop, tokens2WithStop);
console.log('Computed Jaccard (with stop filter):', computedJaccardWithStop);

const resultsWithStop = scoreCandidatesWithStop(query1, [makeIssue(query2, "")], { threshold: 0.18, limit: 1 });
console.log('ScoreCandidates result (with stop filter):', resultsWithStop.length > 0 ? resultsWithStop[0].score : 'No match');

console.log('');
console.log('=== Summary ===');
console.log(`Without stopword filtering: ${manualJaccardNoStop.toFixed(2)}`);
console.log(`With stopword filtering:    ${manualJaccardWithStop.toFixed(2)}`);
console.log(`Difference:                 ${(manualJaccardNoStop - manualJaccardWithStop).toFixed(2)}`);
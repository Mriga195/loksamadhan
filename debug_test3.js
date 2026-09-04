const { tokenize, jaccard, scoreCandidates } = require('./server/lib/similar');

function makeIssue(title, description) {
  return { title, description };
}

// Example from LANE-4-dedup.md
const query1 = "the water is in a bad state on the road";
const query2 = "the road is in a bad state";

console.log('=== Testing the example from LANE-4-dedup.md ===');
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
console.log('=== Testing with different threshold ===');
for (let t = 0.1; t <= 0.8; t += 0.1) {
  const results = scoreCandidates(query1, [makeIssue(query2, "")], { threshold: t, limit: 1 });
  console.log(`Threshold ${t}: ${results.length > 0 ? 'MATCH (' + results[0].score + ')' : 'NO MATCH'}`);
}
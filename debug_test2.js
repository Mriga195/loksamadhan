const { tokenize, jaccard, scoreCandidates } = require('./server/lib/similar');

function makeIssue(title, description) {
  return { title, description };
}

const query = "the road is in a bad state";
const candidates = [
  makeIssue("the water is in a bad state", ""),
  makeIssue("completely unrelated issue here", "")
];

console.log('Query:', query);
console.log('Query tokens:', [...tokenize(query)]);

candidates.forEach((c, i) => {
  const tokens = tokenize(`${c.title} ${c.description}`);
  console.log(`Candidate ${i}:`, c.title);
  console.log(`  Tokens:`, [...tokens]);
  console.log(`  Jaccard:`, jaccard(tokenize(query), tokens));
});

const results = scoreCandidates(query, candidates, { threshold: 0.1, limit: 2 });
console.log('\nResults:');
results.forEach((r, i) => {
  console.log(`  ${i}: ${r.issue.title} (score: ${r.score})`);
});
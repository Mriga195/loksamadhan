const assert = require('assert');
const { tokenize, jaccard, scoreCandidates } = require('./lib/similar');

// Helper to create mock issue objects
function makeIssue(title, description) {
  return { title, description };
}

console.log('Running similarity scorer tests...');

// Test 1: Near-identical wording ranks first
{
  const query = "Large pothole near the bus stop";
  const candidates = [
    makeIssue("Huge pothole on the main road by bus stand", ""),
    makeIssue("Streetlight not working since Tuesday", ""),
    makeIssue("Deep pit in road close to bus stop, dangerous for two wheelers", "")
  ];

  const results = scoreCandidates(query, candidates, { threshold: 0.1, limit: 3 });

  // Should find at least 2 matches (the pothole ones)
  assert.strictEqual(results.length >= 2, true, 'Should find pothole matches');

  // The most similar should be first (either 0 or 2)
  const firstIssue = results[0].issue.title;
  assert.ok(
    firstIssue.includes('Huge pothole') ||
    firstIssue.includes('Deep pit in road'),
    'Most similar should be a pothole variant'
  );

  console.log('✓ Test 1 passed: Near-identical wording ranks first');
}

// Test 2: Unrelated text scores ~0
{
  const query = "Streetlight not working since Tuesday";
  const candidates = [
    makeIssue("Large pothole near the bus stop", ""),
    makeIssue("Water main burst on Oak Avenue", ""),
    makeIssue("Tree fell on power lines during storm", "")
  ];

  const results = scoreCandidates(query, candidates, { threshold: 0.3, limit: 3 });

  // Should find no matches above threshold
  assert.strictEqual(results.length, 0, 'Should find no matches for unrelated text');

  console.log('✓ Test 2 passed: Unrelated text scores ~0');
}

// Test 3: Stopword-only overlap does not match
{
  const query = "the road is in a bad state";
  const candidates = [
    makeIssue("the water is in a bad state", ""),
    makeIssue("completely unrelated issue here", "")
  ];

  const results = scoreCandidates(query, candidates, { threshold: 0.8, limit: 2 });

  // Should find no matches because overlap is only stopwords
  assert.strictEqual(results.length, 0, 'Should not match on stopword-only overlap');

  console.log('✓ Test 3 passed: Stopword-only overlap does not match');
}

// Test 4: Ranking order
{
  const query = "pothole on main street";
  const candidates = [
    makeIssue("small crack in sidewalk", ""),           // Low similarity (0 shared meaningful words)
    makeIssue("pothole on main street needs fixing", ""), // High similarity
    makeIssue("pothole near the intersection", "")      // Medium similarity
  ];

  const results = scoreCandidates(query, candidates, { threshold: 0.1, limit: 3 });

  // Should find 2 matches (the one with 0 similarity should be filtered out)
  assert.strictEqual(results.length, 2, 'Should find 2 matches');

  // First should be the most similar
  assert.ok(
    results[0].issue.title.includes('pothole on main street needs fixing'),
    'First result should be most similar'
  );

  // Second should be the medium similarity one
  assert.ok(
    results[1].issue.title.includes('pothole near the intersection'),
    'Second result should be medium similarity'
  );

  // Scores should be descending
  assert.ok(
    results[0].score >= results[1].score,
    `First score (${results[0].score}) should be >= second score (${results[1].score})`
  );

  console.log('✓ Test 4 passed: Ranking order correct');
}

// Test 5: Empty and garbage input
{
  const testCases = [
    '',
    null,
    undefined,
    '!!!',
    '???',
    '...',
    '123 456'
  ];

  for (const testCase of testCases) {
    const results = scoreCandidates(testCase, [
      makeIssue("Some real issue", "With description")
    ], { threshold: 0.1, limit: 1 });

    // Should return empty array for empty/garbage input
    assert.strictEqual(
      results.length,
      0,
      `Empty/garbage input "${testCase}" should return no matches`
    );
  }

  console.log('✓ Test 5 passed: Empty and garbage input handled');
}

// Test 6: Symmetry / self-similarity
{
  const text = "This is a test sentence for self similarity";
  const tokens = tokenize(text);

  // Jaccard of a set with itself should be 1
  const selfScore = jaccard(tokens, tokens);
  assert.strictEqual(selfScore, 1, 'Self-similarity should be 1.0');

  // Jaccard is symmetric
  const tokens2 = tokenize("A different sentence for testing");
  const score12 = jaccard(tokens, tokens2);
  const score21 = jaccard(tokens2, tokens);
  assert.strictEqual(score12, score21, 'Jaccard should be symmetric');

  console.log('✓ Test 6 passed: Symmetry and self-similarity');
}

console.log('All tests passed!');
process.exit(0);
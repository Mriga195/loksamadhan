const assert = require('assert');

// No network: every case here must resolve without reaching Groq.
delete process.env.GROQ_API_KEY;
const { verifyResolutionProof } = require('./lib/aiVision');

console.log('Running AI vision fallback tests...');

const run = opts => verifyResolutionProof({
  category: 'Road', title: 'Pothole', resolutionNote: 'Filled and levelled', ...opts,
});

(async () => {
  // A missing photo on either side is never a verdict.
  for (const opts of [
    { beforePhoto: null, afterPhoto: '/uploads/a.jpg' },
    { beforePhoto: '/uploads/a.jpg', afterPhoto: null },
  ]) {
    const r = await run(opts);
    assert.strictEqual(r.verified, false);
    assert.strictEqual(r.matchScore, null, 'a missing photo must not produce a score');
    assert.strictEqual(r.provider, 'heuristic');
  }

  // No key configured: honest fallback, still no score to display.
  const noKey = await run({ beforePhoto: 'https://x/a.jpg', afterPhoto: 'https://x/b.jpg' });
  assert.strictEqual(noKey.matchScore, null);
  assert.strictEqual(noKey.provider, 'heuristic');
  assert.match(noKey.summary, /unavailable/i);
  assert.ok(noKey.summary.includes('Filled and levelled'), 'officer note is carried through');

  // With a key but an unreadable local image, the model must not be asked to judge one photo.
  process.env.GROQ_API_KEY = 'test-key-never-used';
  const oneImage = await run({ beforePhoto: '/uploads/does-not-exist.jpg', afterPhoto: 'https://x/b.jpg' });
  assert.strictEqual(oneImage.matchScore, null, 'unreadable image must not reach the model');
  assert.strictEqual(oneImage.provider, 'heuristic');
  assert.match(oneImage.summary, /could not be read/i);

  console.log('✓ All AI vision fallback tests passed');
})();

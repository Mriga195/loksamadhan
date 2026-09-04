// Test what happens with NO filtering (just lowercase and split)

function tokenizeNoFilter(text) {
  return new Set(
    String(text || '').toLowerCase()
      .split(/\s+/)  // Just split on whitespace, no other filtering
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

// Example from LANE-4-dedup.md
const query1 = "the water is in a bad state on the road";
const query2 = "the road is in a bad state";

console.log('=== Testing with NO filtering (just lowercase and split) ===');
console.log('Query 1:', query1);
console.log('Query 2:', query2);

const tokens1None = tokenizeNoFilter(query1);
const tokens2None = tokenizeNoFilter(query2);
console.log('Tokens 1 (no filter):', [...tokens1None]);
console.log('Tokens 2 (no filter):', [...tokens2None]);

const intersectionNone = new Set([...tokens1None].filter(x => tokens2None.has(x)));
console.log('Intersection (no filter):', [...intersectionNone]);
console.log('Intersection size (no filter):', intersectionNone.size);

const unionNone = new Set([...tokens1None, ...tokens2None]);
console.log('Union (no filter):', [...unionNone]);
console.log('Union size (no filter):', unionNone.size);

const manualJaccardNone = intersectionNone.size / unionNone.size;
console.log('Manual Jaccard (no filter):', manualJaccardNone);

const computedJaccardNone = jaccard(tokens1None, tokens2None);
console.log('Computed Jaccard (no filter):', computedJaccardNone);

console.log('');
console.log('=== Testing WITH short word filtering only (length > 2) ===');

function tokenizeShortOnly(text) {
  return new Set(
    String(text || '').toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2)  // Only filter short words
  );
}

const tokens1Short = tokenizeShortOnly(query1);
const tokens2Short = tokenizeShortOnly(query2);
console.log('Tokens 1 (short only):', [...tokens1Short]);
console.log('Tokens 2 (short only):', [...tokens2Short]);

const intersectionShort = new Set([...tokens1Short].filter(x => tokens2Short.has(x)));
console.log('Intersection (short only):', [...intersectionShort]);
console.log('Intersection size (short only):', intersectionShort.size);

const unionShort = new Set([...tokens1Short, ...tokens2Short]);
console.log('Union (short only):', [...unionShort]);
console.log('Union size (short only):', unionShort.size);

const manualJaccardShort = intersectionShort.size / unionShort.size;
console.log('Manual Jaccard (short only):', manualJaccardShort);

const computedJaccardShort = jaccard(tokens1Short, tokens2Short);
console.log('Computed Jaccard (short only):', computedJaccardShort);

console.log('');
console.log('=== Testing WITH stopword removal (our current implementation) ===');
const { tokenize: tokenizeWithStop, jaccard: jaccardWithStop } = require('./server/lib/similar');

const tokens1Stop = tokenizeWithStop(query1);
const tokens2Stop = tokenizeWithStop(query2);
console.log('Tokens 1 (with stop):', [...tokens1Stop]);
console.log('Tokens 2 (with stop):', [...tokens2Stop]);

const intersectionStop = new Set([...tokens1Stop].filter(x => tokens2Stop.has(x)));
console.log('Intersection (with stop):', [...intersectionStop]);
console.log('Intersection size (with stop):', intersectionStop.size);

const unionStop = new Set([...tokens1Stop, ...tokens2Stop]);
console.log('Union (with stop):', [...unionStop]);
console.log('Union size (with stop):', unionStop.size);

const manualJaccardStop = intersectionStop.size / unionStop.size;
console.log('Manual Jaccard (with stop):', manualJaccardStop);

const computedJaccardStop = jaccardWithStop(tokens1Stop, tokens2Stop);
console.log('Computed Jaccard (with stop):', computedJaccardStop);

console.log('');
console.log('=== Summary ===');
console.log(`No filtering:               ${manualJaccardNone.toFixed(2)}`);
console.log(`Short word filtering only:  ${manualJaccardShort.toFixed(2)}`);
console.log(`With stopword removal:      ${manualJaccardStop.toFixed(2)}`);
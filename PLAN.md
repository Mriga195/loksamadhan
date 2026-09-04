# Lane 4 — Duplicate Detection Implementation Plan

## Overview
Implement the end-to-end duplicate detection feature as specified in LANE-4-dedup.md. This includes:
- Server-side similarity scorer (Jaccard algorithm with stopwords)
- API endpoint for finding similar issues
- Client-side Report page with map, duplicate panel, and photo upload
- Integration with existing lanes without modifying their files

## Constraints & Warnings
- Only modify files listed in LANE-4-dedup.md
- Do not touch: app.js, models, middleware, or other lanes' files
- Use existing `api()` wrapper and `publicIssue` serializer
- No new npm dependencies (no NLP, fuzzy-match, or embeddings)
- Route order: similar router MUST be mounted before issues router
- Threshold and radius should be environment-tunable
- Stopword list is critical for correctness

## Phase A: Espainent
### A1. Server Scorer (`server/lib/similar.js`)
- Implement tokenize() function with stopword filtering
- Implement jaccard() function for set similarity
- Implement scoreCandidates() function with threshold and limit
- Export all three functions
- Add environment variable support for threshold
- Include detailed comments about stopwords and tuning

### A2. Test Suite (`server/test-similar.js`)
- Implement 6 test cases as specified:
  1. Near-identical wording ranks first
  2. Unrelated text scores ~0
  3. Stopword-only overlap does not match
  4. Ranking order (not just membership)
  5. Empty/garbage input handling
  6. Symmetry/self-similarity
- Use plain assert, no framework
- Print "all N tests passed" on success
- Exit non-zero on failure

### A3. Similarity Endpoint (`server/routes/similar.js`)
- Create express router
- Implement GET /api/issues/similar endpoint
- Validate lng/lat parameters (finite numbers, valid ranges)
- Validate category parameter against constants.CATEGORIES
- Handle missing/short text (return 200 with empty items)
- Use MongoDB $geoNear pipeline:
  - First stage: $geoNear with 200m radius, category filter, duplicateOf: null, status: not Resolved
  - Limit to 50 candidates
- Pass candidates to scoreCandidates()
- Format response using lane 2's publicIssue serializer
- Add distance (rounded metres) and score to each item
- Support environment variable for radius
- Handle errors appropriately (400 for bad input, 500 for server errors)

## Phase B: UI Implementation
### B1. Map Picker (`client/src/components/MapPicker.jsx`)
- Use react-leaflet with OpenStreetMap tiles
- Import leaflet CSS
- Fix marker icon URLs for bundlers
- Fixed height container (h-72)
- Convert coordinates: Leaflet [lat,lng] ↔ API [lng,lon]
- On mount: getCurrentPosition → center map and drop pin
- On denial/timeout: fallback to hardcoded city centre
- Support draggable marker and click-to-place
- Export selected coordinates as [lng, lat] for API consumption

### B2. Photo Input (`client/src/components/PhotoInput.jsx`)
- Accept ≤3 photos, 5MB each
- Client-side preview
- Count guard
- Only accept jpeg/png/webp
- Return upload paths compatible with lane 2's upload.js

### B3. Duplicate Panel (`client/src/components/DuplicatePanel.jsx`)
- Render only when results exist
- Header: "N people may have already reported this"
- For each card:
  - Thumbnail (from photos array)
  - Title
  - Status pill (using lane 3's StatusPill)
  - Distance ("X m away")
  - Supporter count
  - First line of description
  - Match explanation: "X m away · same category"
  - Two actions:
    * "This is my issue" → support the issue
    * "Report as new" → dismiss for this card
- While loading: show "Checking for similar reports…"
- Do not block submission
- Handle logout flow for "This is my issue"

### B4. Report Page (`client/src/pages/Report.jsx`)
- Field order: Category → Map + Address → Title → Duplicate Panel → Description → Photos → Submit
- useEffect debounced 400ms trigger (category + lat + lng + title.length >= 5)
- Use AbortController to cancel stale requests
- Submit: FormData to POST /api/issues
- Include duplicateOfId when user links to existing issue
- Redirect to created issue's detail page
- Handle FormData correctly (don't set Content-Type manually)

## Phase C: Integration & Testing
### C1. Verify Lane 1 Exports
- Confirm lane 1 provides:
  - models/Issue.js (with 2dsphere index)
  - middleware/auth.js
  - constants.js
  - lib/serialize.js (publicIssue function)
  - api.js wrapper
  - AuthContext.jsx

### C2. Test End-to-End
- Run seed.js from lane 1 to get test data
- Verify scorer passes test-similar.js
- Test /similar endpoint with various inputs
- Test Report page duplicate detection
- Test support/linking workflows
- Verify no regression in other lanes' functionality

### C3. Performance & Tuning
- Tune threshold against lane 1's seed clusters
- Ensure Cluster A (3 potholes within 80m) all surface
- Ensure Cluster B (5km away + wrong category) neither surfaces
- Document chosen threshold value with rationale

## Definition of Done
- [ ] node test-similar.js passes all 6 cases
- [ ] Cluster A: all three seeded potholes surface
- [ ] Cluster B: neither 5km-away nor wrong-category issue surfaces
- [ ] Threshold and radius are environment-tunable with documented values
- [ ] /similar returns 200 with empty list for bad input (never 500)
- [ ] Report page: geolocation works, denial degrades to draggable pin
- [ ] [lng,lat] ordering correct (spot-check on feed map)
- [ ] Duplicate panel appears before submit, shows distance/status
- [ ] "This is my issue" → support recorded → lands on issue detail
- [ ] Filing with link leaves both issues alive and queryable
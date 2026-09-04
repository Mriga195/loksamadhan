// ── Lane 4 owns this file ──
// Stub so the server starts cleanly before Lane 4 pushes their implementation.
// IMPORTANT: This router is mounted BEFORE routes/issues.js at /api/issues
// so that /api/issues/similar is not swallowed by /api/issues/:id.

const router = require('express').Router();

// Lane 4 will implement:
// GET /api/issues/similar?lng=&lat=&category=&text=
//   → returns potential duplicate issues within 200m radius + text similarity

module.exports = router;

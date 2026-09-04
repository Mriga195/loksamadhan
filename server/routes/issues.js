// ── Lane 2 owns this file ──
// Stub so the server starts cleanly before Lane 2 pushes their implementation.

const router = require('express').Router();

// Lane 2 will implement:
// GET    /api/issues          — list issues (with multi-filter support for Challenge Card)
// GET    /api/issues/:id      — single issue detail
// POST   /api/issues          — create issue
// PATCH  /api/issues/:id/assign  — officer assigns department + priority
// PATCH  /api/issues/:id/status  — officer updates status
// POST   /api/issues/:id/support — citizen +1 supports an issue

module.exports = router;

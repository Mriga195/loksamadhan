const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

// The site's own origins, plus local dev. CLIENT_URL still wins when set, so a preview
// deploy can point somewhere else without a code change — but production does not depend on
// an env var being remembered in a dashboard.
const ORIGINS = process.env.CLIENT_URL
  ? [process.env.CLIENT_URL]
  : ['https://www.loksamadhan.online', 'https://loksamadhan.online',
     'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({ origin: ORIGINS }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── Route mounting — ORDER MATTERS ──
// `similar` MUST come before `issues` so /api/issues/similar
// is not swallowed by /api/issues/:id.
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/admin',  require('./routes/admin'));
app.use('/api/issues', require('./routes/similar'));
app.use('/api/issues', require('./routes/issues'));
app.use('/api/stats',  require('./routes/stats'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/translate', require('./routes/translate.route'));

// ── Global error handler ──
app.use((err, _req, res, _next) =>
  res.status(err.status || 500).json({ error: err.message || 'Server error' }));

module.exports = app;

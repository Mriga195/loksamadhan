const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
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

// ── Global error handler ──
app.use((err, _req, res, _next) =>
  res.status(err.status || 500).json({ error: err.message || 'Server error' }));

module.exports = app;

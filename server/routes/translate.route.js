// Translation proxy — keeps the translation call server-side so any future
// API key (e.g. Google Cloud) never touches the browser.
//
// POST /api/translate
//   Body: { texts: string[], target: 'en' | 'as' }
//   Returns: { translations: string[] }
//
// Primary: MyMemory (free, no key).
// Upgrade: set GOOGLE_TRANSLATE_KEY in .env and the handler switches automatically.
//
// On any upstream error the originals are returned so the UI degrades gracefully
// rather than breaking entirely.

const express = require('express');
const router = express.Router();

// ── Simple in-memory rate limiter: 60 requests per IP per minute ──
const ipHits = new Map();
setInterval(() => ipHits.clear(), 60_000);

function rateLimit(req, res, next) {
  const ip = req.ip || 'unknown';
  const hits = (ipHits.get(ip) || 0) + 1;
  ipHits.set(ip, hits);
  if (hits > 60) return res.status(429).json({ error: 'Too many requests' });
  next();
}

// ── MyMemory translate (free tier) ──
async function translateMyMemory(text, target) {
  const src = target === 'as' ? 'en' : 'as';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${target}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);
  const data = await res.json();
  if (data.responseStatus !== 200) throw new Error(data.responseDetails || 'MyMemory error');
  return data.responseData.translatedText;
}

// ── Google Cloud Translate v2 (optional upgrade) ──
async function translateGoogle(text, target, key) {
  const src = target === 'as' ? 'en' : 'as';
  const url = `https://translation.googleapis.com/language/translate/v2?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: src, target, format: 'text' }),
  });
  if (!res.ok) throw new Error(`Google Translate ${res.status}`);
  const data = await res.json();
  return data.data.translations[0].translatedText;
}

// ── Main handler ──
router.post('/', rateLimit, async (req, res) => {
  const { texts, target } = req.body;

  if (!Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: '`texts` must be a non-empty array' });
  }
  if (!['en', 'as'].includes(target)) {
    return res.status(400).json({ error: '`target` must be "en" or "as"' });
  }

  // Translate each text, falling back to the original on individual failures.
  const googleKey = process.env.GOOGLE_TRANSLATE_KEY;
  const translateFn = googleKey ? translateGoogle : translateMyMemory;

  const translations = await Promise.all(
    texts.map(async (text) => {
      if (!text || !text.trim()) return text; // skip blanks
      try {
        const result = googleKey
          ? await translateFn(text, target, googleKey)
          : await translateFn(text, target);
        return result;
      } catch {
        return text; // fallback: return original
      }
    })
  );

  res.json({ translations });
});

module.exports = router;


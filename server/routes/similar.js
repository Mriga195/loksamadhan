const express = require('express');
const router = express.Router();
const { scoreCandidates } = require('../lib/similar');
const { publicIssue } = require('../lib/serialize');
const { CATEGORIES } = require('../constants');

/**
 * GET /api/issues/similar?lng=&lat=&category=&text=
 * Find similar issues based on geographic proximity and text similarity
 * Public endpoint (no authentication required)
 */
router.get('/similar', async (req, res) => {
  try {
    const { lng, lat, category, text } = req.query;

    // Validate required parameters
    if (!lng || !lat) {
      return res.status(400).json({ error: 'Missing lng or lat parameter' });
    }

    const longitude = parseFloat(lng);
    const latitude = parseFloat(lat);

    // Validate lng/lat are finite numbers in valid ranges
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid longitude parameter' });
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
      return res.status(400).json({ error: 'Invalid latitude parameter' });
    }

    // Validate category parameter (required)
    if (!category) {
      return res.status(400).json({ error: 'Missing category parameter' });
    }
    if (CATEGORIES && Array.isArray(CATEGORIES) && !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category parameter' });
    }

    // For missing or short text, return empty list (200, not error)
    // as client calls this on every debounced keystroke
    if (!text || text.trim().length < 5) {
      return res.json({ items: [] });
    }

    // Build MongoDB aggregation pipeline
    // $geoNear must be the first stage
    const matchStage = {
      category,
      duplicateOf: null,
      status: { $nin: ['Resolved', 'Rejected'] }
    };

    const pipeline = [
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [longitude, latitude] },
          distanceField: 'distance',
          maxDistance: parseInt(process.env.SIMILAR_RADIUS_M) || 200, // metres
          query: matchStage,
          spherical: true,
        }
      },
      { $limit: 50 } // Limit candidates for in-process scoring
    ];

    // Execute aggregation
    const candidates = await require('../models/Issue').aggregate(pipeline);

    // Score candidates using Jaccard similarity
    const threshold = parseFloat(process.env.SIMILAR_THRESHOLD) || 0.18;
    const limit = 5;
    const scored = scoreCandidates(text, candidates, { threshold, limit });

    // Format response using publicIssue serializer
    const items = scored.map(({ issue, score }) => {
      const issueObj = publicIssue(issue);
      issueObj.distance = Math.round(issue.distance || 0); // Rounded metres
      issueObj.score = Number(score.toFixed(3)); // Keep 3 decimal places
      return issueObj;
    });

    res.json({ items });
  } catch (error) {
    console.error('Error in /similar endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
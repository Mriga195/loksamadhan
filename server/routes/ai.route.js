const express = require('express');
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const { auth } = require('../middleware/auth');
const { verifyResolutionProof } = require('../lib/aiVision');

const router = express.Router();
const isId = v => mongoose.isValidObjectId(v);

/**
 * POST /api/ai/issues/:id/verify-resolution
 * Compares Before photo (citizen) vs After photo (officer evidence) using Groq Vision.
 *
 * QUOTA SAFETY GUARANTEE:
 * - If already verified and stored in MongoDB, returns the cached result immediately (0 API calls).
 * - Only performs an AI call if not yet evaluated (or ?force=true is passed by an officer/admin).
 */
router.post('/issues/:id/verify-resolution', auth(false), async (req, res, next) => {
  try {
    if (!isId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid issue id.' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    // 1. Check persistent MongoDB cache
    // Do not treat old heuristic/mock results as permanent cache when Groq key is available
    const isHeuristic = issue.aiVerification?.provider === 'heuristic';
    const isCached = issue.aiVerification && issue.aiVerification.verifiedAt && !isHeuristic;
    const forceRefresh = req.query.force === 'true' || isHeuristic;

    if (isCached && !forceRefresh) {
      return res.json({
        cached: true,
        aiVerification: issue.aiVerification,
      });
    }

    // 2. Identify Before & After photos
    const beforePhoto = issue.photos?.[0] || null;
    const afterPhoto = issue.resolution?.evidence?.[0] || null;

    if (!beforePhoto || !afterPhoto) {
      return res.status(400).json({
        error: 'Both a reported citizen photo and officer resolution proof photo are required for comparison.',
      });
    }

    // 3. Run AI verification
    const verification = await verifyResolutionProof({
      beforePhoto,
      afterPhoto,
      category: issue.category,
      title: issue.title,
      resolutionNote: issue.resolution?.note,
    });

    // 4. Save verdict into MongoDB Issue document
    issue.aiVerification = verification;
    await issue.save();

    res.json({
      cached: false,
      aiVerification: issue.aiVerification,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;


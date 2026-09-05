const router = require('express').Router();
const Issue = require('../models/Issue');
const { auth } = require('../middleware/auth');

// What happened on the issues you care about.
//
// Derived from each issue's statusHistory rather than stored as notification rows. Those events
// already exist and are already the audit trail — a second copy would be one more thing to keep
// in sync, and would silently drift the first time a status was written somewhere that forgot
// to also write a notification. The only state that cannot be derived is how far the reader has
// read, which is the one field on User.
//
// Scope is your own reports and nothing else. Supported issues were in here at first and were
// wrong: someone who clicks "I have this problem too" on twenty neighbourhood reports would get
// a feed of twenty other people's issues, drowning updates on the one they actually filed.
// Officers get the ones assigned to them, which is the same idea applied to their work.
const LIMIT = 40;

// The first history entry is the issue being filed. The reporter does not need telling that
// they filed it, so it is never an event for them — but an officer has no other signal that a
// newly assigned issue exists in their list, so they keep it.
function eventsFor(issue, userId) {
  const mine = String(issue.reporter) === userId;
  return (issue.statusHistory || [])
    .filter((h, i) => !(i === 0 && mine))
    .map(h => ({
      issueId: issue._id,
      title: issue.title,
      status: h.status,
      note: h.note || '',
      at: h.at,
      // Why this issue is in your feed at all: one you filed, or one landing on your desk.
      reason: mine ? 'reported' : 'assigned',
    }));
}

router.get('/', auth(), async (req, res, next) => {
  try {
    const userId = String(req.user._id);
    const or = [{ reporter: req.user._id }];
    if (req.user.role === 'officer' || req.user.role === 'admin') {
      or.push({ assignedOfficer: req.user._id });
    }

    // Only the fields the feed renders. statusHistory is the payload; the rest is the label.
    const issues = await Issue.find({ $or: or })
      .select('title reporter statusHistory updatedAt')
      .sort({ updatedAt: -1 })
      .limit(LIMIT)
      .lean();

    const seenAt = req.user.notificationsSeenAt;
    const items = issues
      .flatMap(i => eventsFor(i, userId))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, LIMIT)
      .map(e => ({ ...e, unread: !seenAt || new Date(e.at) > new Date(seenAt) }));

    res.json({ items, unread: items.filter(e => e.unread).length });
  } catch (err) { next(err); }
});

// Mark everything up to now as read. Stamped server-side: a clock-skewed phone would otherwise
// mark future events read and they would never appear.
router.post('/seen', auth(), async (req, res, next) => {
  try {
    req.user.notificationsSeenAt = new Date();
    await req.user.save();
    res.json({ seenAt: req.user.notificationsSeenAt });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.eventsFor = eventsFor;   // exported for test-notifications.js

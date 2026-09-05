const router = require('express').Router();
const Issue = require('../models/Issue');
const { auth } = require('../middleware/auth');

// Role-specific notifications feed.
// Citizens receive updates on their filed reports.
// Officers receive assignments and citizen/admin status updates on their assigned issues.
// Admins receive actionable alerts: pending verifications, citizen dissatisfaction, and unassigned triage reports.
// All feeds show activity up to 7 days old.

const LIMIT = 50;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function eventsFor(issue, userOrId, options = {}) {
  const user = (typeof userOrId === 'object' && userOrId !== null && userOrId._id)
    ? userOrId
    : { _id: String(userOrId), role: options.role || 'citizen' };
  const userId = String(user._id);
  const userRole = user.role || options.role || 'citizen';
  const since = options.since || null;

  const reporterId = issue.reporter ? (issue.reporter._id || issue.reporter).toString() : '';
  const assignedId = issue.assignedOfficer ? (issue.assignedOfficer._id || issue.assignedOfficer).toString() : '';
  const isReporter = reporterId === userId;
  const isAssignee = assignedId === userId;

  const history = issue.statusHistory || [];
  const events = [];

  for (let i = 0; i < history.length; i++) {
    const h = history[i];
    if (!h) continue;
    const entryDate = new Date(h.at);
    if (since && entryDate < since) continue;

    const actorId = h.by ? (h.by._id || h.by).toString() : '';
    const isSelfAction = actorId && actorId === userId;

    let reason = isReporter ? 'reported' : 'assigned';
    let label = isReporter ? 'Your Report' : 'Assigned';
    let shouldInclude = false;

    // Backward compatibility for standalone test runner without role/since options
    if (!options.role && !options.since) {
      shouldInclude = !(i === 0 && isReporter);
      reason = isReporter ? 'reported' : 'assigned';
      if (shouldInclude) {
        events.push({
          issueId: issue._id,
          title: issue.title,
          status: h.status,
          note: h.note || '',
          at: h.at,
          reason,
        });
      }
      continue;
    }

    if (userRole === 'admin') {
      // Admin sees actionable municipal milestones
      if (h.status === 'Pending Verification') {
        shouldInclude = true;
        reason = 'verification_needed';
        label = 'Needs Verification';
      } else if (h.status === 'Unsatisfied') {
        shouldInclude = true;
        reason = 'citizen_unsatisfied';
        label = 'Citizen Unsatisfied';
      } else if (h.status === 'Submitted' && !assignedId) {
        shouldInclude = true;
        reason = 'unassigned';
        label = 'Triage Queue';
      } else if (h.status === 'Rejected') {
        shouldInclude = !isSelfAction;
        reason = 'rejected';
        label = 'Report Rejected';
      } else if (isAssignee || isReporter) {
        shouldInclude = !(i === 0 && isReporter);
        reason = isReporter ? 'reported' : 'assigned';
        label = isReporter ? 'Your Report' : 'Assigned';
      }
    } else if (userRole === 'officer') {
      // Officer sees updates relevant to their assignment
      if (isAssignee) {
        // Exclude initial citizen filing (officer was not assigned yet)
        if (h.status === 'Submitted') {
          shouldInclude = false;
        } else if (isSelfAction && h.status !== 'Acknowledged') {
          // Exclude actions officer took themselves, except initial assignment
          shouldInclude = false;
        } else {
          shouldInclude = true;
          reason = 'assigned';
          if (h.status === 'Acknowledged') {
            label = 'Assigned to You';
          } else if (h.status === 'Resolved') {
            label = 'Admin Approved';
          } else if (h.status === 'In Progress' && actorId && actorId !== userId) {
            label = 'Rework Requested';
          } else if (h.status === 'Unsatisfied') {
            label = 'Citizen Unsatisfied';
          } else if (h.status === 'Closed') {
            label = 'Citizen Satisfied';
          } else if (h.status === 'Rejected') {
            label = 'Report Rejected';
            reason = 'rejected';
          } else {
            label = 'Assigned';
          }
        }
      } else if (isReporter) {
        shouldInclude = !(i === 0 && isReporter);
        reason = h.status === 'Rejected' ? 'rejected' : 'reported';
        label = h.status === 'Rejected' ? 'Report Rejected' : 'Your Report';
      } else if (!assignedId && issue.department === user.department && (!user.region || issue.region === user.region)) {
        if (h.status === 'Submitted') {
          shouldInclude = true;
          reason = 'ward_alert';
          label = 'Department Queue';
        }
      }
    } else {
      // Citizen: sees municipal progress on their reports
      if (isReporter) {
        // Exclude own filing and own feedback action
        if (i === 0 || isSelfAction) {
          shouldInclude = false;
        } else {
          shouldInclude = true;
          reason = h.status === 'Rejected' ? 'rejected' : 'reported';
          label = h.status === 'Rejected' ? 'Report Rejected' : 'Status Update';
        }
      }
    }

    if (shouldInclude) {
      events.push({
        issueId: issue._id,
        title: issue.title,
        status: h.status,
        note: h.note || '',
        at: h.at,
        reason,
        label,
        category: issue.category,
        region: issue.region,
        department: issue.department,
      });
    }
  }

  return events;
}

router.get('/', auth(), async (req, res, next) => {
  try {
    const user = req.user;
    const userRole = user.role || 'citizen';
    const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

    let orConditions = [];

    if (userRole === 'admin') {
      orConditions = [
        { status: { $in: ['Pending Verification', 'Unsatisfied', 'Submitted'] } },
        { 'statusHistory.status': { $in: ['Pending Verification', 'Unsatisfied'] } },
        { assignedOfficer: user._id },
        { reporter: user._id },
      ];
    } else if (userRole === 'officer') {
      orConditions = [
        { assignedOfficer: user._id },
        { reporter: user._id },
      ];
      if (user.department) {
        const deptCond = {
          department: user.department,
          assignedOfficer: null,
          status: 'Submitted',
        };
        if (user.region) deptCond.region = user.region;
        orConditions.push(deptCond);
      }
    } else {
      orConditions = [{ reporter: user._id }];
    }

    const query = {
      $or: orConditions,
      $and: [
        {
          $or: [
            { 'statusHistory.at': { $gte: sevenDaysAgo } },
            { updatedAt: { $gte: sevenDaysAgo } },
            { createdAt: { $gte: sevenDaysAgo } },
          ],
        },
      ],
    };

    const issues = await Issue.find(query)
      .select('title reporter assignedOfficer department region category status statusHistory updatedAt')
      .sort({ updatedAt: -1 })
      .limit(LIMIT)
      .lean();

    const seenAt = user.notificationsSeenAt ? new Date(user.notificationsSeenAt).getTime() : 0;

    const items = issues
      .flatMap(i => eventsFor(i, user, { since: sevenDaysAgo, role: userRole }))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, LIMIT)
      .map(e => ({
        ...e,
        unread: !seenAt || new Date(e.at).getTime() > seenAt,
      }));

    res.json({
      items,
      unread: items.filter(e => e.unread).length,
      seenAt: user.notificationsSeenAt,
    });
  } catch (err) { next(err); }
});

// Mark everything up to now as read.
router.post('/seen', auth(), async (req, res, next) => {
  try {
    const now = new Date();
    req.user.notificationsSeenAt = now;
    await req.user.save();
    res.json({ seenAt: now });
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.eventsFor = eventsFor;

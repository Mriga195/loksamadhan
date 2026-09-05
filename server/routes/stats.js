const router = require('express').Router();
const Issue = require('../models/Issue');
const { auth, requireRole } = require('../middleware/auth');
const { STATUSES, CATEGORIES, DEPARTMENTS } = require('../constants');
const { slaFor, resolvedAt } = require('../lib/sla');

const DAY = 86400000;
const WINDOW = 14;              // sparkline length, in days
const RESOLVED_WINDOW = 7;      // "this week" means trailing 7 days
const AVG_WINDOW = 30;          // avg resolution time trailing 30-day mean

function statusAt(issue, t) {
  if (new Date(issue.createdAt).getTime() > t) return null;
  let status = 'Submitted';
  for (const h of issue.statusHistory || []) {
    if (new Date(h.at).getTime() <= t) status = h.status;
  }
  return status;
}

function dayPoints() {
  const now = Date.now();
  return Array.from({ length: WINDOW }, (_, i) => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() - (WINDOW - 1 - i));
    return Math.min(d.getTime(), now);
  });
}

// GET /api/stats — aggregated counts and headline metrics for dashboard cards
router.get('/', auth(false), async (req, res, next) => {
  try {
    // Run all aggregations and history query in parallel for speed
    const [byStatus, byCategory, byDepartment, total, recentActivity, allIssues] = await Promise.all([
      // Count by status
      Issue.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Count by category
      Issue.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),

      // Count by department (null → "Unassigned")
      Issue.aggregate([
        { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
      ]),

      // Total issues
      Issue.countDocuments(),

      // Last 10 status changes across all issues (recent activity feed)
      Issue.aggregate([
        { $unwind: '$statusHistory' },
        { $sort: { 'statusHistory.at': -1 } },
        { $limit: 10 },
        { $project: {
          _id: 1,
          title: 1,
          status: '$statusHistory.status',
          note: '$statusHistory.note',
          at: '$statusHistory.at',
        } },
      ]),

      // Fetch minimal issue history for sparkline replay
      Issue.find({}, 'createdAt statusHistory status').lean(),
    ]);

    // Convert arrays to { key: count } objects, ensuring all enum values appear (even if 0)
    const statusMap = Object.fromEntries(STATUSES.map(s => [s, 0]));
    byStatus.forEach(r => { if (r._id) statusMap[r._id] = r.count; });

    const categoryMap = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
    byCategory.forEach(r => { if (r._id) categoryMap[r._id] = r.count; });

    const deptMap = Object.fromEntries([...DEPARTMENTS, 'Unassigned'].map(d => [d, 0]));
    byDepartment.forEach(r => { if (r._id) deptMap[r._id] = r.count; });

    // Calculate headline series and metrics
    const points = dayPoints();
    const series = fn => points.map(fn);
    const weekDelta = s => s[s.length - 1] - s[s.length - 1 - RESOLVED_WINDOW];

    const openSeries = series(t => allIssues.filter(i => {
      const s = statusAt(i, t);
      return s && s !== 'Resolved' && s !== 'Closed' && s !== 'Rejected';
    }).length);

    const progressSeries = series(t => allIssues.filter(i => statusAt(i, t) === 'In Progress').length);

    const resolvedSeries = series(t => allIssues.filter(i => {
      const r = resolvedAt(i);
      return r && r <= t && r > t - RESOLVED_WINDOW * DAY;
    }).length);

    const avgDaysSeries = series(t => {
      const done = allIssues.filter(i => {
        const r = resolvedAt(i);
        return r && r <= t && r > t - AVG_WINDOW * DAY;
      });
      if (done.length === 0) return 0;
      const totalMs = done.reduce((sum, i) => sum + (resolvedAt(i) - new Date(i.createdAt).getTime()), 0);
      return totalMs / done.length / DAY;
    });

    const last = s => s[s.length - 1];

    // Punctuality. `settled` is what the promise is actually judged on — an open issue that is
    // not yet late is neither a hit nor a miss, and counting it as either would let a
    // department improve its score simply by sitting on new reports.
    const slas = allIssues.map(i => slaFor(i));
    const settled = slas.filter(s => s.state === 'met' || s.state === 'missed');
    const onTimeRate = settled.length
      ? Math.round((settled.filter(s => s.state === 'met').length / settled.length) * 100)
      : null;

    res.json({
      total,
      sla: {
        onTimeRate,                                                  // null until anything is settled
        settled: settled.length,
        overdue: slas.filter(s => s.state === 'overdue').length,
        dueSoon: slas.filter(s => s.state === 'due-soon').length,
      },
      byStatus: statusMap,
      byCategory: categoryMap,
      byDepartment: deptMap,
      recentActivity,
      metrics: {
        open: {
          value: last(openSeries),
          delta: weekDelta(openSeries),
          series: openSeries,
        },
        progress: {
          value: last(progressSeries),
          delta: weekDelta(progressSeries),
          series: progressSeries,
        },
        resolved: {
          value: last(resolvedSeries),
          delta: weekDelta(resolvedSeries),
          series: resolvedSeries,
        },
        avgDays: {
          value: Number(last(avgDaysSeries).toFixed(1)),
          delta: Number(weekDelta(avgDaysSeries).toFixed(1)),
          series: avgDaysSeries,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

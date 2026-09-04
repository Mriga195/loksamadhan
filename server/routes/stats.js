const router = require('express').Router();
const Issue = require('../models/Issue');
const { auth, requireRole } = require('../middleware/auth');
const { STATUSES, CATEGORIES, DEPARTMENTS } = require('../constants');

// GET /api/stats — aggregated counts for dashboard cards
router.get('/', auth(false), async (req, res, next) => {
  try {
    // Run all aggregations in parallel for speed
    const [byStatus, byCategory, byDepartment, total, recentActivity] = await Promise.all([
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
    ]);

    // Convert arrays to { key: count } objects, ensuring all enum values appear (even if 0)
    const statusMap = Object.fromEntries(STATUSES.map(s => [s, 0]));
    byStatus.forEach(r => { if (r._id) statusMap[r._id] = r.count; });

    const categoryMap = Object.fromEntries(CATEGORIES.map(c => [c, 0]));
    byCategory.forEach(r => { if (r._id) categoryMap[r._id] = r.count; });

    const deptMap = Object.fromEntries([...DEPARTMENTS, 'Unassigned'].map(d => [d, 0]));
    byDepartment.forEach(r => { if (r._id) deptMap[r._id] = r.count; });

    res.json({
      total,
      byStatus: statusMap,
      byCategory: categoryMap,
      byDepartment: deptMap,
      recentActivity,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

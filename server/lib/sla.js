// How long a report is allowed to take, and whether it is late.
//
// Derived, never stored — same reasoning as the notification feed. A `dueAt` column would be
// a second copy of `createdAt + target` that goes stale the moment a target is retuned, and
// would need backfilling across every existing issue to change one number.
//
// Targets are per category and nothing else. Priority deliberately does not shorten them: the
// target is a promise published to citizens ("water issues: 3 working days"), and a promise
// that quietly changes based on how many neighbours clicked support is not one.
// ponytail: flat per-category targets. Per-department or per-region targets if the municipality
// ever commits to different ones.

const DAY = 86400000;

// Ordered by public-health urgency, matching CATEGORY_URGENCY in routes/issues.js.
const TARGET_DAYS = {
  Water: 3,
  Drainage: 3,
  Sanitation: 5,
  Road: 7,
  Streetlight: 7,
  Other: 14,
};
const DEFAULT_TARGET = 14;

// "Due soon" is the last third of the window, not a flat number of days. A flat two days would
// mean a 3-day water report is due-soon from the moment it is filed, which says nothing.
const dueSoonDays = targetDays => Math.max(1, Math.ceil(targetDays / 3));

/**
 * When the issue was last marked fixed or submitted for verification, or null.
 * `.pop()`, not `[0]`: a reopened-and-refixed issue is judged on the resolution that stuck.
 */
function resolvedAt(issue) {
  const entry = (issue.statusHistory || [])
    .filter(h => h.status === 'Resolved' || h.status === 'Closed' || h.status === 'Pending Verification')
    .pop();
  if (entry) return new Date(entry.at).getTime();
  if (issue.resolution?.submittedAt) return new Date(issue.resolution.submittedAt).getTime();
  return null;
}

/**
 * @returns {{targetDays, dueAt, daysLeft, state, breachDays}}
 *   state: 'met' | 'missed'            — closed out, on time or not
 *          'on-track' | 'due-soon' | 'overdue'  — still open
 */
function slaFor(issue, now = Date.now()) {
  const targetDays = TARGET_DAYS[issue.category] ?? DEFAULT_TARGET;
  const created = new Date(issue.createdAt).getTime();
  const dueAt = created + targetDays * DAY;
  const fixedAt = resolvedAt(issue);

  // Settled issues (Resolved or Closed) are evaluated based on when resolution was achieved
  const settled = fixedAt !== null && (issue.status === 'Resolved' || issue.status === 'Closed');

  if (settled) {
    return {
      targetDays,
      dueAt: new Date(dueAt),
      daysLeft: null,
      state: fixedAt <= dueAt ? 'met' : 'missed',
      breachDays: fixedAt > dueAt ? Math.ceil((fixedAt - dueAt) / DAY) : 0,
    };
  }

  // Pending Verification: officer completed the work and submitted resolution proof.
  // The operational SLA clock stops at submittedAt rather than penalizing the officer for admin review delay.
  if (issue.status === 'Pending Verification' && fixedAt !== null) {
    const onTime = fixedAt <= dueAt;
    return {
      targetDays,
      dueAt: new Date(dueAt),
      daysLeft: onTime ? Math.max(0, Math.ceil((dueAt - fixedAt) / DAY)) : null,
      state: onTime ? 'on-track' : 'missed',
      breachDays: onTime ? 0 : Math.ceil((fixedAt - dueAt) / DAY),
    };
  }

  const msLeft = dueAt - now;
  const daysLeft = Math.ceil(msLeft / DAY);
  const state = msLeft < 0 ? 'overdue' : daysLeft <= dueSoonDays(targetDays) ? 'due-soon' : 'on-track';

  return {
    targetDays,
    dueAt: new Date(dueAt),
    daysLeft,
    state,
    breachDays: msLeft < 0 ? Math.ceil(-msLeft / DAY) : 0,
  };
}

module.exports = { slaFor, resolvedAt, TARGET_DAYS, DEFAULT_TARGET, DAY };

const assert = require('assert');
const { slaFor, TARGET_DAYS, DAY } = require('./lib/sla');

const NOW = Date.parse('2026-06-15T12:00:00Z');
const ago = days => new Date(NOW - days * DAY);
const at = days => new Date(NOW - days * DAY);

const open = (category, ageDays) =>
  ({ category, createdAt: ago(ageDays), status: 'In Progress', statusHistory: [] });

const fixed = (category, ageDays, fixedDaysAgo) => ({
  category,
  createdAt: ago(ageDays),
  status: 'Resolved',
  statusHistory: [{ status: 'Resolved', at: at(fixedDaysAgo) }],
});

console.log('Running SLA tests...');

// Targets differ per category — the whole point of replacing the flat 7-day rule.
{
  assert.strictEqual(slaFor(open('Water', 0), NOW).targetDays, TARGET_DAYS.Water);
  assert.strictEqual(slaFor(open('Other', 0), NOW).targetDays, TARGET_DAYS.Other);
  assert.notStrictEqual(TARGET_DAYS.Water, TARGET_DAYS.Other);
}

// A 4-day-old water report is late; a 4-day-old pothole is not.
{
  assert.strictEqual(slaFor(open('Water', 4), NOW).state, 'overdue');
  assert.strictEqual(slaFor(open('Road', 4), NOW).state, 'due-soon');
  assert.strictEqual(slaFor(open('Water', 4), NOW).breachDays, 1);
}

// "Due soon" scales with the target instead of being a flat window — a 3-day target must not
// be due-soon the moment it is filed.
{
  assert.strictEqual(slaFor(open('Water', 0), NOW).state, 'on-track');
  assert.strictEqual(slaFor(open('Other', 1), NOW).state, 'on-track');
}

// Settled issues are judged on when they were fixed, not on today.
{
  assert.strictEqual(slaFor(fixed('Road', 30, 27), NOW).state, 'met',   'fixed on day 3 of 7');
  assert.strictEqual(slaFor(fixed('Road', 30, 10), NOW).state, 'missed', 'fixed on day 20 of 7');
  assert.strictEqual(slaFor(fixed('Road', 30, 10), NOW).breachDays, 13);
}

// A reopened issue is running again: resolvedAt still finds the old entry, but the status is
// no longer resolved, so it must not be scored as settled.
{
  const reopened = {
    category: 'Road',
    createdAt: ago(30),
    status: 'In Progress',
    statusHistory: [
      { status: 'Resolved', at: at(20) },
      { status: 'In Progress', at: at(19) },
    ],
  };
  assert.strictEqual(slaFor(reopened, NOW).state, 'overdue');
}

// An unknown category still gets a deadline rather than NaN.
{
  const s = slaFor(open('Fireworks', 1), NOW);
  assert.ok(Number.isFinite(s.targetDays) && s.state === 'on-track');
}

console.log('All SLA tests passed.');

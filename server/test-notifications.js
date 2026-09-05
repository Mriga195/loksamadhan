const assert = require('assert');
const { eventsFor } = require('./routes/notifications');

const ME = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const THEM = 'bbbbbbbbbbbbbbbbbbbbbbbb';

const issue = {
  _id: 'issue1',
  title: 'Pothole on NH-15',
  reporter: THEM,
  statusHistory: [
    { status: 'Submitted', note: '', at: new Date('2026-01-01') },
    { status: 'Acknowledged', note: 'Assigned to Roads', at: new Date('2026-01-02') },
    { status: 'Resolved', note: 'Filled and sealed', at: new Date('2026-01-05') },
  ],
};

console.log('Running notification-feed tests...');

// An officer has no other signal that a newly assigned issue exists, so they keep the filing.
{
  const events = eventsFor(issue, ME);
  assert.strictEqual(events.length, 3, 'assignee sees every entry including the filing');
  assert.strictEqual(events[0].reason, 'assigned');
}

// The reporter does not need telling that they filed it.
{
  const events = eventsFor({ ...issue, reporter: ME }, ME);
  assert.strictEqual(events.length, 2, 'reporter does not get notified of their own filing');
  assert.strictEqual(events[0].status, 'Acknowledged');
  assert.strictEqual(events[0].reason, 'reported');
}

// reporter is an ObjectId in real documents, not a string — the comparison must survive that.
{
  const objectIdish = { toString: () => ME };
  const events = eventsFor({ ...issue, reporter: objectIdish }, ME);
  assert.strictEqual(events.length, 2, 'ObjectId reporter compares equal to the string id');
}

// An issue with no history yet must not throw.
{
  assert.deepStrictEqual(eventsFor({ ...issue, statusHistory: undefined }, ME), []);
}

console.log('All notification tests passed.');

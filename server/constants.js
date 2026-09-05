// ── Frozen after H0–H2 foundation commit ──
// All lanes import from here. Do NOT duplicate these values.

const CATEGORIES = [
  'Road',
  'Water',
  'Sanitation',
  'Streetlight',
  'Drainage',
  'Other',
];

const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Sewage',
  'Solid Waste Management',
  'Electricity & Lighting',
  'Public Health & Drainage',
  'General Administration',
];

const STATUSES = [
  'Submitted',
  'Acknowledged',
  'In Progress',
  'Pending Verification',
  'Resolved',
  'Closed',
  'Unsatisfied',
];

const PRIORITIES = ['low', 'medium', 'high'];

const ROLES = ['citizen', 'officer', 'admin'];

// Map center for Tezpur, Assam
const DEFAULT_CENTER = [92.7926, 26.6338]; // [lng, lat]

module.exports = {
  CATEGORIES,
  DEPARTMENTS,
  STATUSES,
  PRIORITIES,
  ROLES,
  DEFAULT_CENTER,
};

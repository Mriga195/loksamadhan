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
  'Rejected',
];

const PRIORITIES = ['low', 'medium', 'high'];

const ROLES = ['citizen', 'officer', 'admin'];

// Map center for Tezpur, Assam
const DEFAULT_CENTER = [92.7926, 26.6338]; // [lng, lat]

// Reports are accepted inside Assam only.
// ponytail: bounding box, not the state polygon — a few km of neighbouring states fall inside it.
// Swap for a point-in-polygon test against an Assam GeoJSON if that ever matters.
const ASSAM_BBOX = { minLng: 89.68, minLat: 24.13, maxLng: 96.03, maxLat: 28.22 };
const inAssam = (lng, lat) =>
  lng >= ASSAM_BBOX.minLng && lng <= ASSAM_BBOX.maxLng &&
  lat >= ASSAM_BBOX.minLat && lat <= ASSAM_BBOX.maxLat;

module.exports = {
  CATEGORIES,
  DEPARTMENTS,
  STATUSES,
  PRIORITIES,
  ROLES,
  DEFAULT_CENTER,
  ASSAM_BBOX,
  inAssam,
};

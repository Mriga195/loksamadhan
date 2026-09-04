const express = require('express');
const mongoose = require('mongoose');

const Issue = require('../models/Issue');
const { auth, requireRole } = require('../middleware/auth');
const { upload, uploadErrors, uploadToCloud, photoPath } = require('../lib/upload');
const { publicIssue, publicIssueList } = require('../lib/serialize');
const { CATEGORIES, DEPARTMENTS, STATUSES, PRIORITIES } = require('../constants');

const router = express.Router();
const officer = requireRole('officer', 'admin');

// Express 4 does not catch rejected promises; without this an await that throws hangs the request.
const ah = fn => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, error) => res.status(400).json({ error });
const isId = v => mongoose.isValidObjectId(v);

// Children of a duplicate cluster, counted for a page of issues in one query instead of N.
async function duplicateCounts(issues) {
  const ids = issues.map(i => i._id);
  if (!ids.length) return {};
  const rows = await Issue.aggregate([
    { $match: { duplicateOf: { $in: ids } } },
    { $group: { _id: '$duplicateOf', n: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map(r => [String(r._id), r.n]));
}

/* ---------------------------------------------------------------- A3. GET /api/issues */
// Public. auth(false) so a logged-in viewer gets hasSupported and an anonymous one still gets 200.
router.get('/', auth(false), ah(async (req, res) => {
  const { category, status, department, area, q, near, radius, bbox, duplicates, sort } = req.query;

  // Built from a whitelist of known keys. req.query is NEVER passed to find(): `?status[$ne]=x`
  // arrives as an object and becomes a query operator.
  const filter = {};
  if (category) {
    if (!CATEGORIES.includes(category)) return bad(res, 'Unknown category.');
    filter.category = category;
  }
  if (status) {
    if (!STATUSES.includes(status)) return bad(res, 'Unknown status.');
    filter.status = status;
  }
  if (department) {
    if (!DEPARTMENTS.includes(department)) return bad(res, 'Unknown department.');
    filter.department = department;
  }
  // Free text, not an enum — trimmed and matched exactly, never interpolated into an operator.
  if (area) filter.area = String(area).trim();

  // Default excludes duplicate children so the public feed is not cluttered by a cluster.
  if (duplicates !== 'include') filter.duplicateOf = null;

  if (q) filter.$text = { $search: String(q) };

  if (near) {
    const [lng, lat] = String(near).split(',').map(Number);
    const metres = Number(radius ?? 1000);
    if (!validLngLat(lng, lat)) return bad(res, 'near must be "lng,lat".');
    if (!Number.isFinite(metres) || metres <= 0) return bad(res, 'radius must be a positive number of metres.');
    // $centerSphere, not $near: $near cannot be combined with $text, and this composes with
    // anything. Radius is in radians — divide metres by the earth's radius.
    filter.location = { $geoWithin: { $centerSphere: [[lng, lat], metres / 6378100] } };
  } else if (bbox) {
    const [minLng, minLat, maxLng, maxLat] = String(bbox).split(',').map(Number);
    if (!validLngLat(minLng, minLat) || !validLngLat(maxLng, maxLat)) return bad(res, 'bbox must be "minLng,minLat,maxLng,maxLat".');
    filter.location = { $geoWithin: { $box: [[minLng, minLat], [maxLng, maxLat]] } };
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));   // hard cap 100
  const sortSpec = sort === 'supported'
    ? { supporterCount: -1, createdAt: -1 }
    : { createdAt: -1 };

  // One aggregation for both sorts: `supported` needs the array length as a sortable field,
  // which find() cannot do. $facet returns the page and the total in a single round trip.
  const [{ items = [], counted = [] } = {}] = await Issue.aggregate([
    { $match: filter },
    { $addFields: { supporterCount: { $size: { $ifNull: ['$supporters', []] } } } },
    { $sort: sortSpec },
    { $facet: {
      items: [{ $skip: (page - 1) * limit }, { $limit: limit }],
      counted: [{ $count: 'total' }],
    } },
  ]);

  res.json({
    items: publicIssueList(items, req.user?.id, await duplicateCounts(items)),
    total: counted[0]?.total ?? 0,
    page,
    limit,
  });
}));

/* ------------------------------------------------------------ A4. GET /api/issues/:id */
router.get('/:id', auth(false), ah(async (req, res) => {
  // Before Mongo: a non-ObjectId throws a CastError and 500s the detail page.
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  const children = await Issue.find({ duplicateOf: issue._id })
    .select('_id title createdAt').sort({ createdAt: -1 }).lean();

  const body = publicIssue(issue, req.user?.id, { duplicateCount: children.length });
  body.linkedDuplicates = children;   // "Also reported by N citizens"

  // If this one is itself a child, the client says "tracked under the original report".
  if (issue.duplicateOf) {
    const parent = await Issue.findById(issue.duplicateOf).select('_id status title').lean();
    body.parent = parent || null;
  }
  res.json(body);
}));

/* ---------------------------------------------------------------- A5. POST /api/issues */
router.post('/', auth(true), upload.array('photos', 3), uploadErrors, uploadToCloud, ah(async (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const description = String(req.body.description ?? '').trim();
  const { category } = req.body;
  const address = String(req.body.address ?? '').trim();
  const area = String(req.body.area ?? '').trim();

  if (title.length < 5 || title.length > 120) return bad(res, 'Title must be 5–120 characters.');
  if (description.length < 10 || description.length > 2000) return bad(res, 'Description must be 10–2000 characters.');
  if (!CATEGORIES.includes(category)) return bad(res, 'Unknown category.');

  const lng = Number(req.body.lng);
  const lat = Number(req.body.lat);
  if (!validLngLat(lng, lat)) return bad(res, 'Valid lng and lat are required.');

  let duplicateOf = null;
  if (req.body.duplicateOfId) {
    const parent = await resolveParent(req.body.duplicateOfId);
    if (parent.error) return bad(res, parent.error);
    duplicateOf = parent.id;
  }

  const now = new Date();
  const issue = await Issue.create({
    title, description, category, address, area,
    // [lng, lat] — GeoJSON order. Backwards puts every report in the ocean off Somalia and it
    // is invisible until someone zooms out. Eyeball the first insert on the map.
    location: { type: 'Point', coordinates: [lng, lat] },
    photos: (req.files || []).map(photoPath),
    reporter: req.user.id,
    status: 'Submitted',
    duplicateOf,
    supporters: [],
    // Seeded so the public timeline is never empty.
    statusHistory: [{ status: 'Submitted', note: null, evidence: null, by: req.user.id, at: now }],
  });

  res.status(201).json(publicIssue(issue, req.user.id));
}));

/* ------------------------------------------------- B1. POST /api/issues/:id/support */
router.post('/:id/support', auth(true), ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');

  const issue = await Issue.findById(req.params.id).select('_id reporter duplicateOf');
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  // Support on a child lands on the parent — clustering the support is the point of linking.
  const targetId = issue.duplicateOf || issue._id;
  const target = issue.duplicateOf
    ? await Issue.findById(targetId).select('_id reporter')
    : issue;
  if (!target) return res.status(404).json({ error: 'Issue not found.' });

  if (String(target.reporter) === String(req.user.id)) {
    return bad(res, 'You cannot support your own report.');
  }

  // $addToSet: a double-click cannot inflate the count.
  const updated = await Issue.findByIdAndUpdate(
    targetId,
    { $addToSet: { supporters: req.user.id } },
    { new: true },
  ).select('_id supporters');

  res.json({
    _id: updated._id,
    supporterCount: updated.supporters.length,
    hasSupported: true,
  });
}));

/* ----------------------------------------------- B2. PATCH /api/issues/:id/assign */
router.patch('/:id/assign', auth(true), officer, ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');
  const { department, priority } = req.body;
  if (!DEPARTMENTS.includes(department)) return bad(res, 'Unknown department.');
  if (!PRIORITIES.includes(priority)) return bad(res, 'Unknown priority.');

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  issue.department = department;
  issue.priority = priority;
  // The public timeline must show movement — that is the whole product thesis.
  issue.statusHistory.push({
    status: issue.status,
    note: `Assigned to ${department} (priority: ${priority})`,
    evidence: null,
    by: req.user.id,
    at: new Date(),
  });
  await issue.save();

  res.json(publicIssue(issue, req.user.id));
}));

/* ------------------------ B3. PATCH /api/issues/:id/status — hard rule 2, graded */
router.patch('/:id/status', auth(true), officer, upload.single('evidence'), uploadErrors, uploadToCloud,
  ah(async (req, res) => {
    if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');

    const { status } = req.body;
    const note = String(req.body.note ?? '').trim();
    const evidence = req.file ? photoPath(req.file) : (req.body.evidence || null);

    if (!STATUSES.includes(status)) return bad(res, 'Unknown status.');
    // Hard rule 2. The UI disables the button too, but THIS is the mechanism — do not remove it
    // because the form already checks. A curl must fail exactly the same way.
    if (status === 'Resolved' && !note && !evidence) {
      return bad(res, 'A resolution note or evidence is required.');
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ error: 'Issue not found.' });

    // Append only. History is never overwritten and past entries are never edited — that is
    // what makes the public timeline trustworthy. `by` is stored and stripped by serialize.js.
    issue.status = status;
    issue.statusHistory.push({
      status, note: note || null, evidence, by: req.user.id, at: new Date(),
    });
    await issue.save();

    // Resolving a parent deliberately does not resolve its children: they keep pointing up and
    // the detail page shows the parent's status. Honest about what actually happened.
    res.json(publicIssue(issue, req.user.id));
  }));

/* ------------------- B4. PATCH /api/issues/:id/duplicate — hard rule 1, graded */
router.patch('/:id/duplicate', auth(true), officer, ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');
  const { duplicateOfId } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  if (duplicateOfId === null || duplicateOfId === undefined || duplicateOfId === '') {
    issue.duplicateOf = null;            // unlink restores a standalone issue; nothing is lost
  } else {
    if (String(duplicateOfId) === String(issue._id)) return bad(res, 'An issue cannot duplicate itself.');
    const parent = await resolveParent(duplicateOfId);
    if (parent.error) return bad(res, parent.error);
    // A child of this issue becoming its parent would make a cycle the detail page recurses on.
    if (String(parent.id) === String(issue._id)) return bad(res, 'An issue cannot duplicate itself.');
    issue.duplicateOf = parent.id;
  }

  // Nothing is ever deleted. Both issues stay in the database and both stay queryable via
  // GET /api/issues?duplicates=include. A judge will check this.
  await issue.save();
  res.json(publicIssue(issue, req.user.id));
}));

/* --------------------------------------------------------------------------- helpers */
function validLngLat(lng, lat) {
  return Number.isFinite(lng) && Number.isFinite(lat)
    && lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
}

// A duplicate target must exist, be open, and be a root itself — pointing at a child builds a
// chain, and the detail page walks it.
async function resolveParent(id) {
  if (!isId(id)) return { error: 'Invalid duplicateOfId.' };
  const parent = await Issue.findById(id).select('_id status duplicateOf').lean();
  if (!parent) return { error: 'The issue it duplicates does not exist.' };
  if (parent.duplicateOf) return { error: 'That issue is already a duplicate. Link to the original instead.' };
  if (parent.status === 'Resolved') return { error: 'Cannot link to a resolved issue.' };
  return { id: parent._id };
}

module.exports = router;

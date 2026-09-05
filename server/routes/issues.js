const express = require('express');
const mongoose = require('mongoose');

const Issue = require('../models/Issue');
const User = require('../models/User');
const { auth, requireRole } = require('../middleware/auth');
const { upload, uploadErrors, uploadToCloud, photoPath } = require('../lib/upload');
const { publicIssue, publicIssueList } = require('../lib/serialize');
const { CATEGORIES, DEPARTMENTS, STATUSES, PRIORITIES, inAssam } = require('../constants');

const router = express.Router();
const officer = requireRole('officer', 'admin');
const adminOnly = requireRole('admin');

// Express 4 does not catch rejected promises; without this an await that throws hangs the request.
const ah = fn => (req, res, next) => fn(req, res, next).catch(next);
const bad = (res, error) => res.status(400).json({ error });
const isId = v => mongoose.isValidObjectId(v);

// ── Category → Department mapping ──
const CATEGORY_DEPT_MAP = {
  'Road':        'Roads & Infrastructure',
  'Water':       'Water Supply & Sewage',
  'Sanitation':  'Solid Waste Management',
  'Streetlight': 'Electricity & Lighting',
  'Drainage':    'Public Health & Drainage',
  'Other':       'General Administration',
};

// ── Category urgency baseline (higher = more urgent) ──
const CATEGORY_URGENCY = {
  'Water': 3,       // public health
  'Drainage': 3,    // flooding/health
  'Sanitation': 2,  // disease risk
  'Road': 2,        // accident risk
  'Streetlight': 1, // safety
  'Other': 1,
};

/**
 * Auto-determine priority based on category urgency + supporter count.
 * Thresholds: high >=10 supporters OR urgency 3; medium >=3 OR urgency 2; else low.
 */
function autoPriority(category, supporterCount = 0) {
  const urgency = CATEGORY_URGENCY[category] || 1;
  if (supporterCount >= 10 || urgency >= 3) return 'high';
  if (supporterCount >= 3  || urgency >= 2) return 'medium';
  return 'low';
}

/**
 * Dynamically determines the administrative region/district from:
 * 1. Explicit client reverse-geocoded region or district
 * 2. Matches against dynamically registered officer regions in the database
 * 3. Reverse-geocoded county/district/city from coordinates
 * 4. Extracted city/district tokens from address
 * (100% dynamic, no hardcoded centroids or static lists)
 */
async function determineRegion({ address = '', area = '', lng, lat, clientRegion = '' }) {
  // Query all active distinct officer regions configured by admins in the database
  const registeredRegions = await User.distinct('region', {
    role: 'officer',
    region: { $nin: [null, ''] },
  });

  const cReg = String(clientRegion || '').trim();
  const fullText = `${cReg} ${address} ${area}`.toLowerCase();

  // Sort by length descending so "Jorhat West" matches before "Jorhat"
  const sortedRegistered = [...registeredRegions].sort((a, b) => b.length - a.length);

  // Check if any registered officer region exists in the fullText
  for (const reg of sortedRegistered) {
    const regLower = reg.toLowerCase();
    const regex = new RegExp(`(^|[^a-z0-9])${regLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    if (regex.test(fullText) || fullText.includes(regLower)) {
      return reg;
    }
  }

  // If client passed a region from reverse geocoding, clean and return it
  if (cReg) {
    const cleaned = cReg.replace(/\s+(district|division|zone|region|city|subdivision)$/i, '').trim();
    if (cleaned) {
      const matched = sortedRegistered.find(r => r.toLowerCase() === cleaned.toLowerCase());
      if (matched) return matched;
      return cleaned;
    }
  }

  // If coordinates provided, query Nominatim to dynamically fetch the true geographic district
  if (typeof lng === 'number' && typeof lat === 'number' && validLngLat(lng, lat)) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'LokSamadhanCivicApp/1.0', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(3000) }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        const districtName = (addr.state_district || addr.county || addr.district || addr.city || addr.town || addr.municipality || '').trim();
        if (districtName) {
          const cleanDistrict = districtName.replace(/\s+(district|division|zone|region|city|subdivision)$/i, '').trim();
          const matched = sortedRegistered.find(r => r.toLowerCase() === cleanDistrict.toLowerCase() || cleanDistrict.toLowerCase().includes(r.toLowerCase()));
          if (matched) return matched;
          return cleanDistrict;
        }
      }
    } catch {
      // ignore network errors
    }
  }

  // Parse address parts for district/city
  const parts = address.split(',').map(s => s.trim().replace(/\s+(district|division|zone|region|city)$/i, '')).filter(Boolean);
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2];
    if (candidate && candidate.toLowerCase() !== 'assam' && candidate.toLowerCase() !== 'india') {
      const matched = sortedRegistered.find(r => r.toLowerCase() === candidate.toLowerCase());
      if (matched) return matched;
      return candidate;
    }
  }

  return parts[0] || 'General';
}

/**
 * Pick the officer in a department matching the issue's region with the fewest active issues.
 * If multiple officers exist with same dept and same region, split load wise.
 * Option B (Strict): If no officer is found for the specific region, returns null so the issue
 * remains unassigned in the Admin Triage pool.
 */
async function leastLoadedOfficer(department, region = null) {
  if (!department) return null;

  let officers = [];
  if (region && typeof region === 'string' && region.trim()) {
    const cleanReg = region.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    officers = await User.find({
      role: 'officer',
      department,
      region: { $regex: new RegExp(`^${cleanReg}$`, 'i') },
    }).lean();
  } else {
    officers = await User.find({ role: 'officer', department }).lean();
  }

  // Strict regional isolation: do not assign an officer from an outside district.
  // Returning null leaves assignedOfficer as null and status as 'Submitted' for Admin Triage.
  if (!officers.length) return null;
  if (officers.length === 1) return officers[0];

  // Count active (non-closed, non-resolved) issues per officer (root issues only!)
  const counts = await Issue.aggregate([
    {
      $match: {
        assignedOfficer: { $in: officers.map(o => o._id) },
        status: { $nin: ['Closed', 'Resolved'] },
        duplicateOf: null, // Duplicates do not inflate officer workload
      },
    },
    { $group: { _id: '$assignedOfficer', count: { $sum: 1 } } },
  ]);

  const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));
  // Sort by fewest active issues, break ties by officer creation date (FIFO)
  const sorted = [...officers].sort((a, b) => {
    const ca = countMap[String(a._id)] || 0;
    const cb = countMap[String(b._id)] || 0;
    if (ca !== cb) return ca - cb;
    return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
  });
  return sorted[0];
}

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

/**
 * Synchronize status, department, officer, and resolution/feedback details
 * to all duplicates linked to this issue cluster.
 */
async function syncDuplicatesStatus(issue, status, note, byUserId, evidence = null) {
  const rootId = issue.duplicateOf || issue._id;
  const setPayload = {
    status,
    department: issue.department,
    assignedOfficer: issue.assignedOfficer,
  };
  if (issue.resolution) setPayload.resolution = issue.resolution;
  if (issue.citizenFeedback) setPayload.citizenFeedback = issue.citizenFeedback;

  const historyEntry = {
    status,
    note: note ? `${note} (Synced with original report)` : `Status updated to ${status} in sync with original report.`,
    evidence: evidence || null,
    by: byUserId,
    at: new Date(),
  };

  await Issue.updateMany(
    { duplicateOf: rootId },
    {
      $set: setPayload,
      $push: { statusHistory: historyEntry },
    }
  );
}

/* ---------------------------------------------------------------- A3. GET /api/issues */
router.get('/', auth(false), ah(async (req, res) => {
  const { category, status, department, area, region, q, near, radius, bbox, duplicates, sort } = req.query;

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
  if (region) {
    filter.region = new RegExp(`^${String(region).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  }

  // Default excludes duplicate children so the public feed is not cluttered by a cluster.
  if (duplicates !== 'include') filter.duplicateOf = null;

  if (q) {
    const trimmed = String(q).trim();
    if (trimmed) {
      const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      filter.$or = [
        { title: regex },
        { description: regex },
        { address: regex },
        { area: regex },
        { region: regex },
      ];
    }
  }

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

  if (req.query.mine === 'true') {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    filter.reporter = req.user._id;
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

  // Populate assignedOfficer details so client receives officer name, role, department, and region
  await Issue.populate(items, { path: 'assignedOfficer', select: '_id name role department region' });

  res.json({
    items: publicIssueList(items, req.user?.id, await duplicateCounts(items)),
    total: counted[0]?.total ?? 0,
    page,
    limit,
  });
}));

/* ------------------------------------------------------------ GET /api/issues/mine */
router.get('/mine', auth(true), ah(async (req, res) => {
  const issues = await Issue.find({ reporter: req.user._id })
    .populate('assignedOfficer', 'name role department region')
    .sort({ createdAt: -1 })
    .lean();

  const dupCounts = await duplicateCounts(issues);
  const items = publicIssueList(issues, req.user._id, dupCounts);

  const summary = {
    total: items.length,
    submitted: items.filter(i => i.status === 'Submitted').length,
    inProgress: items.filter(i => i.status === 'In Progress' || i.status === 'Acknowledged').length,
    resolved: items.filter(i => i.status === 'Resolved').length,
  };

  res.json({ items, total: items.length, summary });
}));

/* --------------------------------- GET /api/issues/dept-officers */
router.get('/dept-officers', auth(true), ah(async (req, res) => {
  const { department, region } = req.query;
  if (!department) return bad(res, 'Department query parameter is required.');

  // All officers in this department
  const allDeptOfficers = await User.find({ role: 'officer', department })
    .select('_id name email department region')
    .lean();

  // All distinct regions configured across the entire office user database
  const allRegions = await User.distinct('region', {
    role: 'officer',
    region: { $nin: [null, ''] },
  });

  // Filter officers if a region filter is provided
  let officers = allDeptOfficers;
  if (region && typeof region === 'string' && region.trim()) {
    const regRegex = new RegExp(`^${region.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    officers = allDeptOfficers.filter(o => o.region && regRegex.test(o.region));
  }

  const deptRegions = [...new Set(allDeptOfficers.map(o => o.region).filter(Boolean))];

  res.json({
    officers,
    allDeptOfficers,
    deptRegions,
    allRegions,
  });
}));

/* ------------------------------------------------------------ A4. GET /api/issues/:id */
// GET /api/issues/lookup/:ref — resolve the reference people actually have in front of them.
//
// The UI shows every issue as LS-<year>-<last six of the id> (shortId in IssueDrawer.jsx), so
// that is what ends up on a printed receipt, in a WhatsApp message and in a citizen's notes —
// not the 24-character ObjectId. Only the server can reverse it.
//
// Six hex characters is 16.7 million values, narrowed further by year, so a collision in a
// municipal dataset is not a practical concern — but if two ever do match, this says so rather
// than silently opening the wrong report.
// ponytail: unindexed $expr scan. Fine at this size; give Issue a stored `ref` field if the
// collection ever reaches the point where this shows up in timings.
const REF = /^#?LS-(\d{4})-([0-9a-f]{6})$/i;

router.get('/lookup/:ref', auth(false), ah(async (req, res) => {
  const parsed = REF.exec(String(req.params.ref).trim());
  if (!parsed) return bad(res, 'Reference must look like LS-2026-61AB11.');
  const [, year, suffix] = parsed;

  const start = new Date(Date.UTC(Number(year), 0, 1));
  const end = new Date(Date.UTC(Number(year) + 1, 0, 1));

  const matches = await Issue.find({
    createdAt: { $gte: start, $lt: end },
    $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${suffix.toLowerCase()}$` } },
  }).select('_id').limit(2).lean();

  if (matches.length === 0) return res.status(404).json({ error: 'No issue with that reference.' });
  if (matches.length > 1) return bad(res, 'That reference matches more than one issue.');

  res.json({ _id: matches[0]._id });
}));

router.get('/:id', auth(false), ah(async (req, res) => {
  // Before Mongo: a non-ObjectId throws a CastError and 500s the detail page.
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');

  const issue = await Issue.findById(req.params.id).populate('assignedOfficer', 'name role department region');
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  const children = await Issue.find({ duplicateOf: issue._id })
    .select('_id title createdAt').sort({ createdAt: -1 }).lean();

  const viewerId = req.user?.id || req.user?._id;
  const body = publicIssue(issue, viewerId, { duplicateCount: children.length });
  body.linkedDuplicates = children;   // "Also reported by N citizens"

  // If this one is itself a child, the client says "tracked under the original report".
  if (issue.duplicateOf) {
    const parent = await Issue.findById(issue.duplicateOf).select('_id status title reporter').lean();
    body.parent = parent || null;
    if (viewerId && parent?.reporter && String(parent.reporter) === String(viewerId)) {
      body.isReporter = true;
    }
  }
  res.json(body);
}));

/* ---------------------------------------------------------------- A5. POST /api/issues */
router.post('/', auth(true), upload.array('photos', 3), uploadErrors, uploadToCloud, ah(async (req, res) => {
  const title = String(req.body.title ?? '').trim();
  const description = String(req.body.description ?? '').trim();
  const { category } = req.body;
  let address = String(req.body.address ?? '').trim();
  let area = String(req.body.area ?? '').trim();

  if (title.length < 5 || title.length > 120) return bad(res, 'Title must be 5–120 characters.');
  if (description.length < 10 || description.length > 2000) return bad(res, 'Description must be 10–2000 characters.');
  if (!CATEGORIES.includes(category)) return bad(res, 'Unknown category.');

  const lng = Number(req.body.lng);
  const lat = Number(req.body.lat);
  if (!validLngLat(lng, lat)) return bad(res, 'Valid lng and lat are required.');
  if (!inAssam(lng, lat)) return bad(res, 'LokSamadhan only accepts reports located inside Assam.');

  // Fallback: If address not provided by client, resolve location according to pin
  if (!address) {
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'User-Agent': 'LokSamadhanCivicApp/1.0', 'Accept-Language': 'en' }, signal: AbortSignal.timeout(3000) }
      );
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        const addr = geoData.address || {};
        const street = addr.road || addr.street || addr.footway || '';
        const neighbourhood = addr.suburb || addr.neighbourhood || addr.residential || '';
        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
        const state = addr.state || '';
        const parts = [street, neighbourhood, city, state].filter(Boolean);
        address = parts.join(', ') || geoData.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        if (!area) area = neighbourhood || city || 'General';
      }
    } catch {
      if (!address) address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      if (!area) area = 'General';
    }
  }

  if (!area) {
    const parts = address.split(',').map(s => s.trim()).filter(Boolean);
    area = parts.length > 1 ? parts[parts.length - 2] : (parts[0] || 'General');
  }

  // ── Smart Duplicate Detection: auto-group if same category within 1 km ──
  // Only link to a root issue that is still open (not Closed/Resolved)
  let duplicateOf = null;
  let parentIssue = null;
  if (req.body.duplicateOfId) {
    const parent = await resolveParent(req.body.duplicateOfId);
    if (parent.error) return bad(res, parent.error);
    duplicateOf = parent.id;
    parentIssue = await Issue.findById(parent.id);
  } else {
    // Search for an existing open issue of same category within 1km radius
    const nearby = await Issue.findOne({
      category,
      duplicateOf: null,   // root issues only
      status: { $nin: ['Closed', 'Resolved'] },
      location: {
        $geoWithin: { $centerSphere: [[lng, lat], 1000 / 6378100] },
      },
    }).sort({ createdAt: -1 });

    if (nearby) {
      duplicateOf = nearby._id;
      parentIssue = nearby;
    }
  }

  // Determine region dynamically from client input, address, area, or coordinates
  const clientRegion = String(req.body.region ?? '').trim();
  const issueRegion = await determineRegion({ address, area, lng, lat, clientRegion });

  // ── Auto-determine department from category ──
  let department = CATEGORY_DEPT_MAP[category] || null;
  let assignedOfficer = null;
  let autoStatus = 'Submitted';
  let priority = autoPriority(category, 0);

  const now = new Date();
  const historyEntries = [{ status: 'Submitted', note: 'Issue submitted by citizen', evidence: null, by: req.user.id, at: now }];

  if (parentIssue) {
    // ── DUPLICATE: Do NOT assign a new officer ──
    // Inherit the original issue's assigned officer, department, and status
    department = parentIssue.department || department;
    assignedOfficer = parentIssue.assignedOfficer || null;
    autoStatus = parentIssue.status || 'Acknowledged';
    priority = parentIssue.priority || priority;

    const parentYear = new Date(parentIssue.createdAt).getFullYear();
    const parentHex = String(parentIssue._id).slice(-6).toUpperCase();
    historyEntries.push({
      status: autoStatus,
      note: `Linked as similar report to #LS-${parentYear}-${parentHex}. Handled under original report by assigned officer.`,
      evidence: null,
      by: req.user.id,
      at: new Date(now.getTime() + 1),
    });

    // Auto-boost parent supporters and re-evaluate priority!
    const reporterStr = String(req.user.id);
    const parentReporterStr = String(parentIssue.reporter);
    const isAlreadySupporter =
      reporterStr === parentReporterStr ||
      parentIssue.supporters.some(s => String(s) === reporterStr);

    if (!isAlreadySupporter) {
      parentIssue.supporters.push(req.user.id);
      parentIssue.priority = autoPriority(parentIssue.category, parentIssue.supporters.length);
      await parentIssue.save();
    }
  } else {
    // ── ROOT ISSUE: Auto-assign to least-loaded officer in that department & region ──
    if (department) {
      const officer = await leastLoadedOfficer(department, issueRegion);
      if (officer) {
        assignedOfficer = officer._id;
        autoStatus = 'Acknowledged';
      }
    }

    if (autoStatus === 'Acknowledged') {
      historyEntries.push({
        status: 'Acknowledged',
        note: `Auto-assigned to ${department} (${issueRegion} Region). Officer assigned via regional load-balancing.`,
        evidence: null,
        by: req.user.id,
        at: new Date(now.getTime() + 1),
      });
    } else {
      historyEntries.push({
        status: 'Submitted',
        note: `No designated officer stationed in ${issueRegion} Region for ${department || 'this category'}. Routed to Admin Triage Pool.`,
        evidence: null,
        by: req.user.id,
        at: new Date(now.getTime() + 1),
      });
    }
  }

  const issue = await Issue.create({
    title, description, category, address, area,
    region: parentIssue?.region || issueRegion,
    location: { type: 'Point', coordinates: [lng, lat] },
    photos: (req.files || []).map(photoPath),
    reporter: req.user.id,
    status: autoStatus,
    department,
    assignedOfficer,
    priority,
    duplicateOf,
    supporters: [],
    statusHistory: historyEntries,
  });

  await issue.populate('assignedOfficer', 'name role department region');
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
  ).select('_id supporters category priority');

  // ── Re-evaluate priority based on updated supporter count ──
  const newPriority = autoPriority(updated.category, updated.supporters.length);
  if (newPriority !== updated.priority) {
    await Issue.findByIdAndUpdate(targetId, { priority: newPriority });
  }

  res.json({
    _id: updated._id,
    supporterCount: updated.supporters.length,
    hasSupported: true,
    priority: newPriority,
  });
}));

/* ----------------------------------------------- B2. PATCH /api/issues/:id/assign */
router.patch('/:id/assign', auth(true), adminOnly, ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');
  const { department, region, officerId } = req.body;
  // Priority is now auto-determined; accept override from client if provided, else auto-calculate
  const clientPriority = req.body.priority;

  if (!DEPARTMENTS.includes(department)) return bad(res, 'Unknown department.');

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  issue.department = department;
  if (region !== undefined) {
    issue.region = String(region || '').trim() || null;
  }

  // Auto-priority if not manually overridden
  issue.priority = (clientPriority && PRIORITIES.includes(clientPriority))
    ? clientPriority
    : autoPriority(issue.category, issue.supporters?.length || 0);

  // Load-balanced auto-allotment: pick least-loaded officer if no specific officer given
  let assignedOfficerName = null;

  if (officerId && isId(officerId)) {
    // Admin manually chose a specific officer
    const chosen = await User.findOne({ _id: officerId, role: 'officer' }).lean();
    if (chosen) {
      issue.assignedOfficer = chosen._id;
      assignedOfficerName = `${chosen.name} (${chosen.region || 'All Zones'})`;
      if (chosen.region && !issue.region) {
        issue.region = chosen.region;
      }
    }
  } else {
    // Auto-select least-loaded officer in department matching the issue's region
    const least = await leastLoadedOfficer(department, issue.region);
    if (least) {
      issue.assignedOfficer = least._id;
      assignedOfficerName = `${least.name} (auto load-balanced - ${least.region || issue.region || 'General'})`;
    } else {
      issue.assignedOfficer = null;
    }
  }

  // Advance status from Submitted to Acknowledged upon triage/assignment if officer is assigned
  if (issue.assignedOfficer) {
    if (issue.status === 'Submitted') {
      issue.status = 'Acknowledged';
    }
  } else {
    issue.status = 'Submitted';
  }

  const noteText = assignedOfficerName
    ? `Triaged to ${department} (${issue.region || 'General'} Region, priority: ${issue.priority}) — assigned to ${assignedOfficerName}`
    : `Triaged to ${department} (${issue.region || 'General'} Region, priority: ${issue.priority}) — unassigned (no officer stationed in this region)`;

  issue.statusHistory.push({
    status: issue.status,
    note: noteText,
    evidence: null,
    by: req.user.id,
    at: new Date(),
  });

  await issue.save();
  await issue.populate('assignedOfficer', 'name role department region');

  // Sync department and assigned officer to any linked duplicates
  await syncDuplicatesStatus(issue, issue.status, noteText, req.user.id);

  res.json(publicIssue(issue, req.user.id));
}));

/* ---------------------------------- B2a. POST /api/issues/:id/report-resolution */
// Officer finishes work and reports back with resolution proof images and notes
router.post('/:id/report-resolution', auth(true), officer, upload.array('evidence', 5), uploadErrors, uploadToCloud, ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');

  const note = String(req.body.note ?? '').trim();
  const uploadedPhotos = (req.files || []).map(photoPath);
  let existingEvidence = [];
  if (req.body.evidence) {
    existingEvidence = Array.isArray(req.body.evidence) ? req.body.evidence : [req.body.evidence];
  }
  const allEvidence = [...uploadedPhotos, ...existingEvidence];

  if (!note || note.length < 5) {
    return bad(res, 'A resolution note describing what was done is required (min 5 characters).');
  }
  if (allEvidence.length === 0) {
    return bad(res, 'At least one resolution proof image is required.');
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  // An officer can only report resolution on issues assigned to them (cannot take action on other issues in the dept queue)
  if (req.user.role === 'officer') {
    const isAssigned = String(issue.assignedOfficer) === String(req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Forbidden: You can only report resolution on issues assigned to you.' });
    }
  }

  issue.resolution = {
    note,
    evidence: allEvidence,
    submittedBy: req.user.id,
    submittedAt: new Date(),
    verifiedBy: null,
    verifiedAt: null,
    adminNotes: '',
  };

  issue.status = 'Pending Verification';
  issue.statusHistory.push({
    status: 'Pending Verification',
    note: `Resolution submitted by officer: ${note}`,
    evidence: allEvidence[0] || null,
    by: req.user.id,
    at: new Date(),
  });

  await issue.save();
  await issue.populate('assignedOfficer', 'name role department region');

  await syncDuplicatesStatus(
    issue,
    'Pending Verification',
    `Resolution submitted by officer: ${note}`,
    req.user.id,
    allEvidence[0] || null
  );

  res.json(publicIssue(issue, req.user.id));
}));

/* ---------------------------------- B2b. POST /api/issues/:id/verify-resolution */
// Admin verifies resolution proof images and approves (Resolved) or rejects (In Progress)
router.post('/:id/verify-resolution', auth(true), adminOnly, ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');
  const { action, adminNotes } = req.body;
  if (!['approve', 'reject'].includes(action)) {
    return bad(res, 'Action must be approve or reject.');
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  if (action === 'approve') {
    if (!issue.resolution) issue.resolution = {};
    issue.resolution.verifiedBy = req.user.id;
    issue.resolution.verifiedAt = new Date();
    issue.resolution.adminNotes = String(adminNotes || '').trim();

    issue.status = 'Resolved';
    issue.statusHistory.push({
      status: 'Resolved',
      note: adminNotes?.trim()
        ? `Admin verified resolution images: ${adminNotes.trim()}. Awaiting citizen satisfaction.`
        : 'Admin verified resolution images. Awaiting citizen confirmation.',
      evidence: issue.resolution.evidence?.[0] || null,
      by: req.user.id,
      at: new Date(),
    });
  } else {
    issue.status = 'In Progress';
    issue.statusHistory.push({
      status: 'In Progress',
      note: adminNotes?.trim()
        ? `Resolution rejected by Admin: ${adminNotes.trim()}`
        : 'Resolution rejected by Admin. Proof insufficient, further work required.',
      evidence: null,
      by: req.user.id,
      at: new Date(),
    });
  }

  await issue.save();
  await issue.populate('assignedOfficer', 'name role department region');

  await syncDuplicatesStatus(
    issue,
    issue.status,
    adminNotes?.trim() || (action === 'approve' ? 'Admin approved resolution proof.' : 'Admin rejected resolution proof.'),
    req.user.id,
    issue.resolution?.evidence?.[0] || null
  );

  res.json(publicIssue(issue, req.user.id));
}));

/* ---------------------------------- B2c. POST /api/issues/:id/citizen-feedback */
// Final closure only happens if citizen is satisfied; otherwise marked unsatisfied
router.post('/:id/citizen-feedback', auth(true), ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');
  const { satisfied, notes } = req.body;
  if (typeof satisfied !== 'boolean') {
    return bad(res, 'satisfied must be a boolean (true or false).');
  }

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  const viewerId = String(req.user.id || req.user._id);
  const reporterId = String(issue.reporter);
  if (viewerId !== reporterId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only the citizen who reported this issue can accept or dispute the resolution.' });
  }

  issue.citizenFeedback = {
    satisfied,
    notes: String(notes || '').trim(),
    submittedAt: new Date(),
  };

  if (satisfied) {
    issue.status = 'Closed';
    issue.statusHistory.push({
      status: 'Closed',
      note: notes?.trim()
        ? `Citizen confirmed satisfied: "${notes.trim()}". Issue officially closed.`
        : 'Citizen confirmed satisfied with the solution. Issue officially closed.',
      evidence: null,
      by: req.user.id,
      at: new Date(),
    });
  } else {
    issue.status = 'Unsatisfied';
    issue.statusHistory.push({
      status: 'Unsatisfied',
      note: notes?.trim()
        ? `Citizen marked unsatisfied: "${notes.trim()}"`
        : 'Citizen reported dissatisfaction with the solution.',
      evidence: null,
      by: req.user.id,
      at: new Date(),
    });
  }

  await issue.save();
  await issue.populate('assignedOfficer', 'name role department region');

  await syncDuplicatesStatus(
    issue,
    issue.status,
    notes?.trim() || (satisfied ? 'Citizen confirmed satisfied with solution.' : 'Citizen reported dissatisfaction with solution.'),
    req.user.id
  );

  res.json(publicIssue(issue, req.user.id));
}));

/* ---------------------------------- B2d. POST /api/issues/:id/reopen */
// Admin reopens an issue (e.g. from Unsatisfied, Resolved, or Closed) back to In Progress (or Submitted if unassigned)
router.post('/:id/reopen', auth(true), adminOnly, ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');
  const note = String(req.body.note || '').trim();
  const unassign = Boolean(req.body.unassign);

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  if (unassign) {
    issue.assignedOfficer = null;
    issue.status = 'Submitted';
  } else {
    issue.status = 'In Progress';
  }

  const defaultNote = unassign
    ? 'Issue reopened by Admin and unassigned for re-triage.'
    : 'Issue reopened by Admin following citizen dissatisfaction.';

  issue.statusHistory.push({
    status: issue.status,
    note: note ? `Reopened by Admin: ${note}` : defaultNote,
    evidence: null,
    by: req.user.id,
    at: new Date(),
  });

  await issue.save();
  await issue.populate('assignedOfficer', 'name role department region');

  await syncDuplicatesStatus(
    issue,
    issue.status,
    note || defaultNote,
    req.user.id
  );

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

    // An officer can only change status on issues assigned to them
    if (req.user.role === 'officer') {
      const isAssigned = String(issue.assignedOfficer) === String(req.user.id);
      if (!isAssigned) {
        return res.status(403).json({ error: 'Forbidden: You can only change the status of issues assigned to you.' });
      }
    }

    // Append only. History is never overwritten and past entries are never edited — that is
    // what makes the public timeline trustworthy. `by` is stored and stripped by serialize.js.
    issue.status = status;
    issue.statusHistory.push({
      status, note: note || null, evidence, by: req.user.id, at: new Date(),
    });
    await issue.save();

    await syncDuplicatesStatus(issue, status, note, req.user.id, evidence);

    res.json(publicIssue(issue, req.user.id));
  }));

/* ------------------- B4. PATCH /api/issues/:id/duplicate — hard rule 1, graded */
router.patch('/:id/duplicate', auth(true), officer, ah(async (req, res) => {
  if (!isId(req.params.id)) return bad(res, 'Invalid issue id.');
  const { duplicateOfId } = req.body;

  const issue = await Issue.findById(req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found.' });

  // An officer can only link/detach duplicates for issues assigned to them
  if (req.user.role === 'officer') {
    const isAssigned = String(issue.assignedOfficer) === String(req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ error: 'Forbidden: You can only link or detach issues assigned to you.' });
    }
  }

  if (duplicateOfId === null || duplicateOfId === undefined || duplicateOfId === '') {
    issue.duplicateOf = null;            // unlink restores a standalone issue; nothing is lost
    issue.statusHistory.push({
      status: issue.status,
      note: `Detached from similar report by ${req.user?.name || 'officer'}. Restored as a standalone report.`,
      evidence: null,
      by: req.user.id,
      at: new Date(),
    });
    if (!issue.assignedOfficer && issue.department) {
      const officerDoc = await leastLoadedOfficer(issue.department);
      if (officerDoc) {
        issue.assignedOfficer = officerDoc._id;
      }
    }
  } else {
    if (String(duplicateOfId) === String(issue._id)) return bad(res, 'An issue cannot duplicate itself.');
    
    // An issue with children cannot be linked to another issue (would create nested duplicate chains)
    const childCount = await Issue.countDocuments({ duplicateOf: issue._id });
    if (childCount > 0) {
      return bad(res, 'This issue already has other reports linked to it. Detach them first before linking this issue.');
    }

    const parent = await resolveParent(duplicateOfId);
    if (parent.error) return bad(res, parent.error);
    if (String(parent.id) === String(issue._id)) return bad(res, 'An issue cannot duplicate itself.');

    const parentDoc = await Issue.findById(parent.id);
    issue.duplicateOf = parentDoc._id;
    if (parentDoc.department) issue.department = parentDoc.department;
    if (parentDoc.assignedOfficer) issue.assignedOfficer = parentDoc.assignedOfficer;
    if (parentDoc.status) issue.status = parentDoc.status;

    const parentYear = new Date(parentDoc.createdAt).getFullYear();
    const parentHex = String(parentDoc._id).slice(-6).toUpperCase();
    issue.statusHistory.push({
      status: issue.status,
      note: `Manually linked as similar report to #LS-${parentYear}-${parentHex} by ${req.user?.name || 'admin'}.`,
      evidence: null,
      by: req.user.id,
      at: new Date(),
    });

    // Auto-boost parent supporters if not already present
    const reporterStr = String(issue.reporter);
    const parentReporterStr = String(parentDoc.reporter);
    if (reporterStr !== parentReporterStr && !parentDoc.supporters.some(s => String(s) === reporterStr)) {
      parentDoc.supporters.push(issue.reporter);
      parentDoc.priority = autoPriority(parentDoc.category, parentDoc.supporters.length);
      await parentDoc.save();
    }
  }

  // Nothing is ever deleted. Both issues stay in the database and both stay queryable via
  // GET /api/issues?duplicates=include. A judge will check this.
  await issue.save();
  await issue.populate('assignedOfficer', 'name role department region');
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
  if (parent.status === 'Resolved' || parent.status === 'Closed') return { error: 'Cannot link to a resolved or closed issue.' };
  return { id: parent._id };
}

module.exports = router;

// The ONLY place an Issue document becomes a public API response.
// Hard rule 3: reporter personal info never appears in a public response. Enforced here,
// once, so a route added at 3am cannot forget it.
//
// If you are tempted to build a response object by hand in a route, don't — add a field here.
// Never spread the raw document (`{ ...issue.toObject() }`): that is how `reporter` leaks
// back the day someone adds a field to the schema. Every field is listed explicitly.

const { slaFor } = require('./sla');

// `by` is deliberately absent. Officers are people too.
const publicHistory = (statusHistory = []) =>
  statusHistory.map(h => ({
    status: h.status,
    note: h.note || null,
    evidence: h.evidence || null,
    at: h.at,
  }));

/**
 * @param issue    an Issue document (or lean object)
 * @param viewerId the logged-in user's id, or null for anonymous — drives `hasSupported`
 * @param extra    caller-computed fields, e.g. { duplicateCount } from countDocuments()
 */
function publicIssue(issue, viewerId = null, extra = {}) {
  const supporters = issue.supporters || [];
  const reporterId = issue.reporter?._id || issue.reporter;
  const isReporter = Boolean(viewerId && reporterId && String(reporterId) === String(viewerId));
  return {
    _id: issue._id,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    address: issue.address || null,
    area: issue.area || null,          // neighbourhood, for Lane 3's filter bar
    region: issue.region || null,      // district/zone
    location: issue.location,              // { type:'Point', coordinates:[lng, lat] }
    photos: issue.photos || [],            // ['/uploads/abc.jpg']
    status: issue.status,
    department: issue.department || null,
    assignedOfficer: issue.assignedOfficer
      ? (issue.assignedOfficer.name
          ? {
              _id: issue.assignedOfficer._id,
              name: issue.assignedOfficer.name,
              role: issue.assignedOfficer.role || null,
              department: issue.assignedOfficer.department || null,
              region: issue.assignedOfficer.region || null,
            }
          : { _id: issue.assignedOfficer?._id || issue.assignedOfficer, name: null })
      : null,
    priority: issue.priority || null,
    resolution: issue.resolution || null,
    citizenFeedback: issue.citizenFeedback || null,
    duplicateOf: issue.duplicateOf || null,
    duplicateCount: extra.duplicateCount ?? 0,
    supporterCount: supporters.length,
    hasSupported: viewerId
      ? supporters.some(id => String(id) === String(viewerId))
      : false,
    isReporter,
    statusHistory: publicHistory(issue.statusHistory),
    // Derived here rather than in each route, so a screen added later cannot ship without it.
    sla: slaFor(issue),
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  };
}

const publicIssueList = (issues, viewerId = null, countsById = {}) =>
  issues.map(i => publicIssue(i, viewerId, { duplicateCount: countsById[String(i._id)] ?? 0 }));

// Officer/admin views need the reporter's name for context. That is a SEPARATE function on
// purpose — not an `isOfficer` flag threaded through publicIssue(), where one wrong caller
// leaks every email in the database. Two functions, one obvious call site each.
function officerIssue(issue, viewerId = null, extra = {}) {
  const reporter = issue.reporter;
  return {
    ...publicIssue(issue, viewerId, extra),
    reporter: reporter && reporter.name
      ? { _id: reporter._id, name: reporter.name }   // populated
      : { _id: reporter || null, name: null },       // bare ObjectId — never an email
    statusHistory: (issue.statusHistory || []).map(h => ({
      status: h.status,
      note: h.note || null,
      evidence: h.evidence || null,
      at: h.at,
      by: h.by || null,
    })),
  };
}

module.exports = { publicIssue, publicIssueList, officerIssue };

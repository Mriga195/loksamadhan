import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import AssignControls from './AssignControls';
import Icon from './Icon';
import StatusPill from './StatusPill';
import StatusTimeline from './StatusTimeline';
import SafeImage from './SafeImage';
import ConfirmDialog from './ConfirmDialog';
import AttachDuplicateModal from './AttachDuplicateModal';

export const shortId = issue =>
  `LS-${new Date(issue.createdAt).getFullYear()}-${String(issue._id).slice(-6).toUpperCase()}`;

const fullDate = iso => new Date(iso).toLocaleString(undefined, {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

const age = iso => {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor((Date.now() - new Date(iso)) / 3600000);
  return hours > 0 ? `${hours}h ago` : 'just now';
};

const PRIORITY_COLORS = {
  high:   'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  low:    'bg-slate-100 text-slate-700 border-slate-200',
};

// ── Officer-Specific Actions based on issue state ──
function OfficerActions({ issue, onSaved, onClose, onUpdateStatus }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  async function markInProgress() {
    setActionLoading(true);
    setActionError(null);
    try {
      const form = new FormData();
      form.append('status', 'In Progress');
      form.append('note', 'Officer acknowledged and is working on the issue.');
      const updated = await apiFetch(`/api/issues/${issue._id}/status`, { method: 'PATCH', body: form });
      onSaved?.(updated);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
    }
  }

  const status = issue.status;
  const isAssignedToMe = true; // drawer only shows to officer who has access

  // What actions are relevant for this officer right now?
  if (status === 'Closed') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        <span className="font-bold">✓ Officially Closed</span> — no further action required.
      </div>
    );
  }

  if (status === 'Pending Verification') {
    return (
      <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
        <div className="flex items-center gap-2 font-bold">
          <span className="size-2 rounded-full bg-purple-600 animate-pulse" />
          Awaiting Admin Verification
        </div>
        <p className="mt-1">Your resolution proof has been submitted. Wait for the administrator to verify the images.</p>
      </div>
    );
  }

  if (status === 'Resolved') {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
        <div className="flex items-center gap-2 font-bold text-emerald-800">✓ Resolution Verified by Admin</div>
        <p className="mt-1">Awaiting citizen's final acceptance. No further action needed from you.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actionError && <p className="text-xs text-rose-600 font-medium">{actionError}</p>}

      {(status === 'Submitted' || status === 'Acknowledged') && (
        <button
          type="button"
          disabled={actionLoading}
          onClick={markInProgress}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors disabled:opacity-50"
        >
          {actionLoading ? 'Updating…' : 'Mark as In Progress (Start Working)'}
        </button>
      )}

      {status === 'In Progress' && (
        <button
          type="button"
          onClick={() => onUpdateStatus(issue)}
          className="w-full rounded-xl bg-brand-600 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition-colors cursor-pointer"
        >
          Report Resolution &amp; Upload Proof
        </button>
      )}

      {status === 'Unsatisfied' && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          <span className="font-bold">Citizen Unsatisfied</span> — Admin will reopen. Prepare for additional work.
          {issue.citizenFeedback?.notes && (
            <p className="mt-1 italic">Feedback: "{issue.citizenFeedback.notes}"</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── AI verdict on the officer's proof photos ──
// Admin-only and advisory: a vision model comparing two photos of the same street from different
// angles will often call it a mismatch, so this informs the approve/reject decision, never makes it.
function AIProofCheck({ issue }) {
  const [ai, setAi] = useState(issue.aiVerification || null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const hasBothPhotos = (issue.photos?.length || 0) > 0 && (issue.resolution?.evidence?.length || 0) > 0;
  const score = ai?.matchScore;
  const hasVerdict = ai && score !== null && score !== undefined;

  async function run() {
    if (busy) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch(`/api/ai/issues/${issue._id}/verify-resolution?force=true`, { method: 'POST' });
      setAi(res?.aiVerification || null);
    } catch (e) {
      setErr(e.message || 'AI check could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  if (!hasBothPhotos) return null;

  return (
    <div className="rounded-lg border border-purple-200/70 bg-white/70 p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900">
          AI proof check
        </span>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          className="rounded-md border border-purple-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-50 cursor-pointer"
        >
          {busy ? 'Analysing…' : hasVerdict ? 'Re-run' : 'Run check'}
        </button>
      </div>

      {err && <p className="text-[11px] font-medium text-rose-600">{err}</p>}

      {hasVerdict ? (
        <div className="space-y-1">
          <p className={`text-[11px] font-bold ${ai.verified ? 'text-emerald-700' : 'text-amber-700'}`}>
            {ai.verified ? '✓ Photos look consistent' : '⚠ Possible mismatch'} — {score}% match
          </p>
          <p className="text-[11px] leading-snug text-ink-muted">{ai.summary}</p>
          <p className="text-[10px] text-ink-muted">Advisory only — your approval is what decides this issue.</p>
        </div>
      ) : (
        <p className="text-[11px] text-ink-muted">
          {ai?.summary || 'Not run yet. Compares the citizen photo against the officer proof.'}
        </p>
      )}
    </div>
  );
}

// ── Admin-Specific Actions based on issue state ──
function AdminActions({ issue, onSaved, onUpdateStatus, onOpenAttachModal }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [unassignOnReopen, setUnassignOnReopen] = useState(false);
  const [showReassign, setShowReassign] = useState(false);

  const status = issue.status;
  const isClosedOrResolved = status === 'Closed' || status === 'Resolved';
  const isAssigned = Boolean(
    issue.assignedOfficer && (issue.assignedOfficer.name || issue.assignedOfficer._id)
  );

  async function handleVerify(action) {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch(`/api/issues/${issue._id}/verify-resolution`, {
        method: 'POST',
        body: JSON.stringify({
          action,
          adminNotes: adminNote.trim() || (action === 'approve'
            ? 'Resolution proof verified by administrator'
            : 'Resolution rejected by admin. Rework required.'),
        }),
      });
      onSaved?.(updated);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
      setShowRejectForm(false);
    }
  }

  async function handleReopen() {
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await apiFetch(`/api/issues/${issue._id}/reopen`, {
        method: 'POST',
        body: JSON.stringify({
          note: adminNote.trim() || 'Reopened by Admin.',
          unassign: unassignOnReopen,
        }),
      });
      onSaved?.(updated);
    } catch (e) {
      setActionError(e.message);
    } finally {
      setActionLoading(false);
      setShowReopenForm(false);
      setUnassignOnReopen(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Assignment triage — ONLY shown for open, unassigned issues (e.g. newly reported or reopened without an assigned officer). Hidden if assigned, closed, or resolved. */}
      {!isClosedOrResolved && !isAssigned && (
        <div>
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
            Triage &amp; Allotment
          </h3>
          <AssignControls issue={issue} onSaved={onSaved} />
        </div>
      )}

      {/* If officer is already assigned and not closed/resolved, show triage only if Reassign is explicitly toggled */}
      {!isClosedOrResolved && isAssigned && showReassign && (
        <div className="rounded-xl border border-brand-200 bg-brand-50/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-brand-900">
              Reassign Officer / Allotment
            </h3>
            <button
              type="button"
              onClick={() => setShowReassign(false)}
              className="text-[11px] text-ink-muted hover:text-ink font-medium cursor-pointer"
            >
              Cancel
            </button>
          </div>
          <AssignControls
            issue={issue}
            onSaved={updated => {
              setShowReassign(false);
              onSaved?.(updated);
            }}
          />
        </div>
      )}

      {/* State-specific admin actions */}
      {actionError && <p className="text-xs text-rose-600 font-medium">{actionError}</p>}

      {status === 'Pending Verification' && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 space-y-2">
          <p className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-purple-600 animate-pulse" />
            Verify Resolution Proof
          </p>
          {issue.resolution?.note && (
            <p className="text-xs italic text-purple-800">Officer note: "{issue.resolution.note}"</p>
          )}
          <AIProofCheck issue={issue} />
          {!showRejectForm ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => handleVerify('approve')}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                {actionLoading ? 'Saving…' : '✓ Approve & Move to Resolved'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowRejectForm(true)}
                className="flex-1 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
              >
                ✕ Reject Proof
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-purple-400"
                rows={2}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Reason for rejection / rework instructions for the officer..."
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRejectForm(false)} className="text-xs text-ink-muted px-2 py-1 hover:bg-canvas rounded cursor-pointer">Cancel</button>
                <button
                  type="button"
                  disabled={actionLoading || !adminNote.trim()}
                  onClick={() => handleVerify('reject')}
                  className="flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Unsatisfied, Resolved, or Closed: Reopen Workflow */}
      {(status === 'Unsatisfied' || status === 'Resolved' || status === 'Closed') && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 space-y-2">
          <p className="text-[11px] font-bold text-rose-900 uppercase tracking-wider">
            {status === 'Unsatisfied' ? 'Citizen Unsatisfied — Reopen?' : `${status} Issue — Reopen?`}
          </p>
          {issue.citizenFeedback?.notes && (
            <p className="text-xs italic text-rose-800">"{issue.citizenFeedback.notes}"</p>
          )}
          {!showReopenForm ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setShowReopenForm(true)}
              className="w-full rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
            >
              ↺ Reopen Issue
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
                rows={2}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Reopening note / instructions for officer..."
              />
              {isAssigned && (
                <label className="flex items-center gap-2 text-xs text-ink cursor-pointer pt-0.5 select-none">
                  <input
                    type="checkbox"
                    checked={unassignOnReopen}
                    onChange={e => setUnassignOnReopen(e.target.checked)}
                    className="rounded border-line text-brand-600 focus:ring-brand-500"
                  />
                  <span>Unassign officer &amp; send to triage queue</span>
                </label>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowReopenForm(false);
                    setUnassignOnReopen(false);
                  }}
                  className="text-xs text-ink-muted px-2 py-1 hover:bg-canvas rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleReopen}
                  className="flex-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? 'Reopening…' : 'Confirm Reopen'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* If assigned and not closed/resolved, provide action button to reassign officer */}
      {!isClosedOrResolved && isAssigned && !showReassign && (
        <button
          type="button"
          onClick={() => setShowReassign(true)}
          className="w-full rounded-xl border border-line bg-canvas py-2 text-xs font-medium text-ink hover:bg-surface transition-colors cursor-pointer flex items-center justify-center gap-1.5"
        >
          <Icon name="shield" className="size-3.5 text-brand-600" />
          Reassign Officer
        </button>
      )}

      {(status === 'Submitted' || status === 'Acknowledged' || status === 'In Progress') && (
        <button
          type="button"
          onClick={() => onUpdateStatus(issue)}
          className="w-full rounded-xl border border-line bg-canvas py-2 text-xs font-medium text-ink hover:bg-surface transition-colors cursor-pointer"
        >
          Change Status / Add Note
        </button>
      )}

      {!issue.duplicateOf && status !== 'Resolved' && status !== 'Closed' && (
        <button
          type="button"
          onClick={onOpenAttachModal}
          className="w-full rounded-xl border border-brand-200 bg-brand-50/70 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          title="Manually link this report as a duplicate of an existing root report"
        >
          <Icon name="link" className="size-3.5 text-brand-600" />
          Attach as Similar / Duplicate Report
        </button>
      )}
    </div>
  );
}

export default function IssueDrawer({ issue, linkedDuplicates = [], onClose, onSaved, onUpdateStatus, onSelectIssue, onRefresh }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isOfficer = user?.role === 'officer';
  const canManage = isAdmin || isOfficer;
  const [showAllSimilar, setShowAllSimilar] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null); // { id, title }
  const [isDetaching, setIsDetaching] = useState(false);
  const [detachMsg, setDetachMsg] = useState(null);
  const [showAttachModal, setShowAttachModal] = useState(false);

  useEffect(() => {
    setShowAllSimilar(false);
    setDetachMsg(null);
    setConfirmTarget(null);
    setShowAttachModal(false);
  }, [issue?._id]);

  const executeDetach = async () => {
    if (!confirmTarget?.id) return;
    const targetIssueId = confirmTarget.id;
    setIsDetaching(true);
    setDetachMsg(null);
    try {
      const updated = await apiFetch(`/api/issues/${targetIssueId}/duplicate`, {
        method: 'PATCH',
        body: JSON.stringify({ duplicateOfId: null }),
      });
      onSaved?.(updated);
      onRefresh?.();
      setConfirmTarget(null);
      setDetachMsg('Issue successfully detached and restored as standalone report.');
      setTimeout(() => setDetachMsg(null), 4000);
    } catch (err) {
      alert(err.message || 'Failed to detach issue');
    } finally {
      setIsDetaching(false);
    }
  };

  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const evidence = [
    ...(issue.photos || []).map(src => ({ src, label: 'Citizen Reported Photo' })),
    ...(issue.resolution?.evidence || []).map(src => ({ src, label: 'Resolution Proof Photo' })),
    ...(issue.statusHistory || [])
      .filter(h => h.evidence && !(issue.resolution?.evidence || []).includes(h.evidence))
      .map(h => ({ src: h.evidence, label: `Evidence — ${h.status}` })),
  ];

  return (
    <aside
      aria-label="Issue detail"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-xl lg:top-16"
    >
      <header className="flex items-start gap-2 border-b border-line p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/issues/${issue._id}`}
              target="_blank"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
            >
              #{shortId(issue)}
              <Icon name="external" className="size-3.5" />
            </Link>
            <StatusPill status={issue.status} size="sm" />
            {issue.priority && (
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_COLORS[issue.priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {issue.priority === 'high' && <span className="size-1.5 rounded-full bg-red-500" />}
                {issue.priority === 'medium' && <span className="size-1.5 rounded-full bg-amber-500" />}
                {issue.priority === 'low' && <span className="size-1.5 rounded-full bg-slate-400" />}
                {issue.priority}
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-base font-semibold leading-snug text-ink">{issue.title}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <Icon name="map" className="size-3.5 shrink-0 text-slate-400" />
            {issue.address || issue.area || 'Location not given'}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-muted">Submitted {fullDate(issue.createdAt)}</p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* Supporter count badge */}
            {(issue.supporterCount > 0) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                {issue.supporterCount} supporter{issue.supporterCount === 1 ? '' : 's'}
              </span>
            )}
            {/* Assigned Officer Pill */}
            {issue.assignedOfficer && (issue.assignedOfficer.name || issue.assignedOfficer._id) ? (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 border border-slate-200">
                <Icon name="shield" className="size-3 text-brand-600" />
                <span>
                  Officer: <strong>{issue.assignedOfficer.name || 'Assigned'}</strong>
                </span>
                {issue.assignedOfficer.region && (
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({issue.assignedOfficer.region})
                  </span>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs text-amber-800 border border-amber-200">
                <Icon name="shield" className="size-3 text-amber-600" />
                <span>Officer: <strong>Unassigned</strong></span>
              </div>
            )}
            {issue.department && (
              <div className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600 border border-slate-200">
                <Icon name="building" className="size-3" />
                {issue.department}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail panel"
          className="cursor-pointer rounded-lg p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
        >
          <Icon name="close" className="size-4" />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-5 text-sm">
        {issue.description && (
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">{issue.description}</p>
        )}

        {/* Resolution evidence preview */}
        {issue.resolution?.evidence?.length > 0 && (
          <div className="rounded-xl border border-purple-200 bg-purple-50/40 p-3">
            <p className="text-[11px] font-semibold text-purple-900 uppercase tracking-wider mb-2">
              Officer Resolution Proof
            </p>
            {issue.resolution?.note && (
              <p className="mb-2 text-xs italic text-purple-800">"{issue.resolution.note}"</p>
            )}
            <div className="grid grid-cols-3 gap-2">
              {issue.resolution.evidence.map((src, idx) => (
                <a key={idx} href={src} target="_blank" rel="noreferrer"
                  className="block aspect-square overflow-hidden rounded-lg border border-line bg-slate-50">
                  <SafeImage src={src} alt="Resolution evidence" className="size-full object-cover hover:scale-105 transition-transform" fallbackText="Proof photo" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Similar Reports from other citizens */}
        {linkedDuplicates.length > 0 && (() => {
          const limit = 1;
          const visible = showAllSimilar ? linkedDuplicates : linkedDuplicates.slice(0, limit);
          const hasMore = linkedDuplicates.length > limit;

          return (
            <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Icon name="users" className="size-3.5 text-amber-700" /> Similar Citizen Reports ({linkedDuplicates.length})
                </h3>
                <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Nearby within 1km
                </span>
              </div>
              <p className="text-xs text-amber-800">
                {linkedDuplicates.length} additional {linkedDuplicates.length === 1 ? 'citizen reported' : 'citizens reported'} this same problem:
              </p>
              {detachMsg && (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs text-emerald-800 font-medium">
                  {detachMsg}
                </div>
              )}
              <div className="space-y-2">
                {visible.map(dup => (
                  <div
                    key={dup._id}
                    onClick={() => onSelectIssue?.(dup._id)}
                    className="rounded-lg border border-line bg-surface p-2.5 text-xs space-y-1 hover:border-brand-300 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink truncate max-w-[200px]">#{shortId(dup)} — {dup.title}</span>
                      <span className="text-[10px] text-ink-muted shrink-0">{age(dup.createdAt)}</span>
                    </div>
                    {dup.description && (
                      <p className="text-[11px] text-ink-muted line-clamp-2 italic">"{dup.description}"</p>
                    )}
                    {dup.photos?.length > 0 && (
                      <div className="flex gap-1 pt-1">
                        {dup.photos.map((src, idx) => (
                          <a key={idx} href={src} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                            className="size-10 rounded overflow-hidden border border-line bg-slate-50">
                            <SafeImage src={src} alt="Evidence preview" className="size-full object-cover hover:scale-105 transition-transform" fallbackText="" iconClassName="size-4" />
                          </a>
                        ))}
                      </div>
                    )}
                    {canManage && (
                      <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-slate-100">
                        <span className="text-[10px] text-ink-muted">Linked report</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmTarget({ id: dup._id, title: dup.title });
                          }}
                          className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Detach this similar report so it becomes an independent standalone report"
                        >
                          <svg className="size-3 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          <span>Detach issue</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {hasMore && (
                <div className="pt-1 flex items-center justify-between text-xs text-amber-900 border-t border-amber-200/60 mt-2">
                  <span className="text-[11px] text-amber-800">
                    Showing {visible.length} of {linkedDuplicates.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllSimilar(prev => !prev)}
                    className="font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer text-xs"
                  >
                    {showAllSimilar ? 'Show less' : `Show more (+${linkedDuplicates.length - limit} more)`}
                  </button>
                </div>
              )}
            </section>
          );
        })()}

        {/* Citizen Photos */}
        {(issue.photos?.length > 0) && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-muted">
              <Icon name="photo" className="size-3.5 text-ink-muted" />
              Citizen Photos ({issue.photos.length})
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {issue.photos.map((src, idx) => (
                <a key={idx} href={src} target="_blank" rel="noreferrer" title="Citizen photo"
                  className="group relative overflow-hidden rounded-lg border border-line aspect-square bg-slate-50">
                  <SafeImage src={src} alt="Citizen photo" className="size-full object-cover transition-transform group-hover:scale-105" fallbackText="Photo" />
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Status Timeline */}
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">Full Audit Trail</h3>
          {issue.statusHistory?.length > 0 ? (
            <StatusTimeline history={issue.statusHistory} />
          ) : (
            <p className="text-xs text-ink-muted">No status changes yet.</p>
          )}
        </section>
      </div>

      {/* Footer: Role-specific Actions */}
      <footer className="space-y-3 border-t border-line bg-surface p-4">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">Actions</h3>
        {issue.duplicateOf ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5">
            <div className="font-bold text-amber-900 flex items-center gap-1.5">
              <Icon name="external" className="size-3 text-amber-700" /> Similar Report
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              This report is similar to original issue #{String(issue.duplicateOf).slice(-6).toUpperCase()}. All investigation, officer resolution, and verification are managed on the original report.
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-200/60 mt-2">
              <button
                type="button"
                onClick={() => onSelectIssue?.(issue.duplicateOf)}
                className="inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline text-xs cursor-pointer"
              >
                View Original Report &rarr;
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setConfirmTarget({ id: issue._id, title: issue.title })}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors cursor-pointer shadow-xs"
                  title="Detach from original to manage this as a standalone report"
                >
                  Detach from original
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {isAdmin && (
              <AdminActions
                issue={issue}
                onSaved={onSaved}
                onUpdateStatus={onUpdateStatus}
                onOpenAttachModal={() => setShowAttachModal(true)}
              />
            )}
            {isOfficer && (
              <OfficerActions issue={issue} onSaved={onSaved} onClose={onClose} onUpdateStatus={onUpdateStatus} />
            )}
          </>
        )}
      </footer>

      {/* Custom Confirmation Dialog for Detaching */}
      <ConfirmDialog
        isOpen={Boolean(confirmTarget)}
        title="Detach similar issue?"
        message={
          <>
            Are you sure you want to detach{' '}
            <strong className="font-semibold text-slate-900">
              {confirmTarget?.title ? `"${confirmTarget.title}"` : 'this issue'}
            </strong>
            ?
            <br />
            It will become an independent, standalone report with its own lifecycle, officer assignment, and status.
          </>
        }
        confirmText="Detach report"
        cancelText="Cancel"
        tone="danger"
        isPending={isDetaching}
        onConfirm={executeDetach}
        onClose={() => !isDetaching && setConfirmTarget(null)}
      />

      {/* Admin Manual Duplicate Linking Modal */}
      {isAdmin && (
        <AttachDuplicateModal
          issue={issue}
          isOpen={showAttachModal}
          onClose={() => setShowAttachModal(false)}
          onAttached={(updated) => {
            setShowAttachModal(false);
            onSaved?.(updated);
            onRefresh?.();
            setDetachMsg('Issue successfully attached and linked as similar report.');
            setTimeout(() => setDetachMsg(null), 4000);
          }}
        />
      )}
    </aside>
  );
}

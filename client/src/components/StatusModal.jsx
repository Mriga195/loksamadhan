import { useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import StatusPill from './StatusPill';
import { formatTimelineNote } from './StatusTimeline';

export default function StatusModal({ issue, onClose, onSaved }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const isAssignedToMe = Boolean(
    issue.assignedOfficer &&
    String(issue.assignedOfficer?._id || issue.assignedOfficer) === String(user?._id)
  );

  // Mode is determined strictly by role and current issue status:
  // - Admin + Pending Verification  -> 'verify'
  // - Admin + Unsatisfied           -> 'reopen'
  // - Admin + other (e.g. Submitted)-> 'status'
  // - Officer (Not assigned to me)  -> 'info' (read-only state)
  // - Officer + In Progress         -> 'report_resolution'
  // - Officer + Submitted/Ack       -> 'status' (start working)
  // - Officer + pending/closed/etc  -> 'info' (read-only state)
  const mode = (() => {
    if (isAdmin) {
      if (issue.status === 'Pending Verification') return 'verify';
      if (issue.status === 'Unsatisfied') return 'reopen';
      return 'status';
    }
    // If not admin and not assigned to this officer, read-only!
    if (!isAssignedToMe) return 'info';

    if (issue.status === 'In Progress') return 'report_resolution';
    if (issue.status === 'Submitted' || issue.status === 'Acknowledged') return 'status';
    return 'info';
  })();

  const defaultStatus =
    issue.status === 'Submitted' || issue.status === 'Acknowledged'
      ? 'In Progress'
      : issue.status;

  const [status, setStatus] = useState(defaultStatus);
  const [note, setNote] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [adminAction, setAdminAction] = useState('approve');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleFilesChange = e => {
    const files = Array.from(e.target.files || []);
    setEvidenceFiles(files);
    setPreviewUrls(files.map(f => URL.createObjectURL(f)));
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (mode === 'info') {
      onClose();
      return;
    }

    setError(null);
    setSaving(true);

    try {
      let updated;
      if (mode === 'report_resolution') {
        if (!note.trim() || note.trim().length < 5) {
          throw new Error('Please enter a resolution note explaining what was fixed (at least 5 characters).');
        }
        if (evidenceFiles.length === 0) {
          throw new Error('At least one resolution proof photo is required for image verification.');
        }

        const form = new FormData();
        form.append('note', note.trim());
        evidenceFiles.forEach(file => {
          form.append('evidence', file);
        });

        updated = await apiFetch(`/api/issues/${issue._id}/report-resolution`, {
          method: 'POST',
          body: form,
        });
      } else if (mode === 'verify') {
        updated = await apiFetch(`/api/issues/${issue._id}/verify-resolution`, {
          method: 'POST',
          body: JSON.stringify({
            action: adminAction,
            adminNotes: note.trim(),
          }),
        });
      } else if (mode === 'reopen') {
        updated = await apiFetch(`/api/issues/${issue._id}/reopen`, {
          method: 'POST',
          body: JSON.stringify({ note: note.trim() }),
        });
      } else {
        // Standard status update
        const form = new FormData();
        form.append('status', status);
        form.append('note', note.trim());
        updated = await apiFetch(`/api/issues/${issue._id}/status`, {
          method: 'PATCH',
          body: form,
        });
      }

      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const modalTitle =
    mode === 'report_resolution'
      ? 'Report Resolution & Submit Proof'
      : mode === 'verify'
      ? 'Admin: Verify Resolution Proof'
      : mode === 'reopen'
      ? 'Admin: Reopen Issue'
      : mode === 'info'
      ? 'Issue Status'
      : isAdmin
      ? 'Update Issue Status'
      : 'Start Working on Issue';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-xs"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-surface p-6 shadow-xl border border-line"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">{modalTitle}</h2>
            <p className="mt-1 truncate text-xs text-ink-muted">{issue.title}</p>
          </div>
          <StatusPill status={issue.status} />
        </div>

        {/* Recent Status Timeline (if any) */}
        {issue.statusHistory?.length > 0 && (
          <div className="mt-4 rounded-xl border border-line bg-canvas/40 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">Recent Timeline</p>
            <ol className="space-y-2 text-xs">
              {issue.statusHistory.slice(-2).map((h, i) => (
                <li key={i} className="flex items-start gap-2">
                  <StatusPill status={h.status} size="sm" />
                  <span className="text-ink-muted text-[11px]">{new Date(h.at).toLocaleDateString()}</span>
                  {h.note && <span className="text-ink truncate font-normal">"{formatTimelineNote(h.note)}"</span>}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 1. OFFICER: REPORT RESOLUTION */}
        {mode === 'report_resolution' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3 text-xs text-blue-900 leading-relaxed">
              <span className="font-semibold">Workflow Rule:</span> Attach photo evidence of the completed work. The issue moves to <strong className="font-bold">Pending Verification</strong> for municipal admin review before citizen sign-off.
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Resolution Note <span className="text-rose-600">*</span>
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand-500 focus:bg-surface focus:outline-none"
                rows={3}
                required
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Describe the action taken to resolve this problem..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Resolution Proof Photos <span className="text-rose-600">*</span>
              </label>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="mt-1.5 block w-full text-xs text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                onChange={handleFilesChange}
              />
              <p className="mt-1 text-[11px] text-ink-muted">Attach 1 or more images showing the resolved state.</p>

              {previewUrls.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {previewUrls.map((url, idx) => (
                    <img key={idx} src={url} alt="Proof preview" className="size-16 rounded-lg object-cover border border-line" />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. ADMIN: VERIFY RESOLUTION */}
        {mode === 'verify' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900 leading-relaxed">
              <span className="font-semibold">Admin Verification:</span> Inspect the officer's resolution proof images. Approving advances the issue to <strong className="font-bold">Resolved</strong> for citizen acceptance.
            </div>

            {/* Officer submitted evidence review */}
            {issue.resolution?.evidence?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1.5">Submitted Proof Photos</p>
                <div className="flex flex-wrap gap-2">
                  {issue.resolution.evidence.map((src, idx) => (
                    <a key={idx} href={src} target="_blank" rel="noreferrer" className="block size-20 overflow-hidden rounded-lg border border-line">
                      <img src={src} alt="Resolution evidence" className="size-full object-cover hover:scale-105 transition-transform" />
                    </a>
                  ))}
                </div>
                {issue.resolution.note && (
                  <p className="mt-2 text-xs italic text-ink-muted">Officer Note: "{issue.resolution.note}"</p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">Verification Decision</label>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdminAction('approve')}
                  className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                    adminAction === 'approve'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-line bg-canvas text-ink-muted'
                  }`}
                >
                  ✓ Approve Proof &amp; Resolve
                </button>
                <button
                  type="button"
                  onClick={() => setAdminAction('reject')}
                  className={`rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                    adminAction === 'reject'
                      ? 'border-rose-600 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-line bg-canvas text-ink-muted'
                  }`}
                >
                  ✕ Reject (Needs Work)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Admin Notes {adminAction === 'reject' && <span className="text-rose-600">*</span>}
              </label>
              <textarea
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand-500 focus:bg-surface focus:outline-none"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder={adminAction === 'approve' ? 'Optional verification comment...' : 'Reason for rejection (instructions for officer)...'}
                required={adminAction === 'reject'}
              />
            </div>
          </div>
        )}

        {/* 3. ADMIN: REOPEN */}
        {mode === 'reopen' && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900 leading-relaxed">
              <span className="font-semibold">Citizen Unsatisfied:</span> The reporter expressed dissatisfaction with the resolution. As Administrator, you can reopen this issue back to <strong className="font-bold">In Progress</strong>.
            </div>

            {issue.citizenFeedback?.notes && (
              <div className="rounded-lg bg-canvas p-3 border border-line text-xs">
                <span className="font-semibold text-rose-700">Citizen Dispute Reason:</span>
                <p className="mt-0.5 text-ink italic">"{issue.citizenFeedback.notes}"</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">Reopening Instructions</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand-500 focus:bg-surface focus:outline-none"
                rows={3}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Instructions for the department and officer regarding the citizen's feedback..."
              />
            </div>
          </div>
        )}

        {/* 4. STATUS UPDATE: (Admin general update OR Officer starting work) */}
        {mode === 'status' && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</label>
              <select
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-xs text-ink cursor-pointer focus:border-brand-500 focus:outline-none"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                {issue.status === 'Submitted' && (
                  <>
                    <option value="In Progress">In Progress (Start Working)</option>
                    <option value="Acknowledged">Acknowledged</option>
                  </>
                )}
                {issue.status === 'Acknowledged' && (
                  <>
                    <option value="In Progress">In Progress (Start Working)</option>
                    <option value="Acknowledged">Acknowledged</option>
                  </>
                )}
                {issue.status === 'In Progress' && (
                  <>
                    <option value="In Progress">In Progress</option>
                    <option value="Acknowledged">Acknowledged</option>
                  </>
                )}
                {issue.status !== 'Submitted' && issue.status !== 'Acknowledged' && issue.status !== 'In Progress' && (
                  <option value={issue.status}>{issue.status}</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">Progress Note</label>
              <textarea
                className="mt-1 w-full rounded-xl border border-line bg-canvas px-3 py-2 text-sm text-ink focus:border-brand-500 focus:bg-surface focus:outline-none"
                rows={2}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add an update note..."
              />
            </div>
          </div>
        )}

        {/* 5. READ-ONLY / INFORMATIONAL STATUS */}
        {mode === 'info' && (
          <div className="mt-4 rounded-xl border border-line bg-canvas p-4 text-xs text-ink space-y-2">
            {!isAdmin && !isAssignedToMe && (
              <p>
                <strong className="font-semibold text-amber-700">Department Queue (Read-Only):</strong>{' '}
                {issue.assignedOfficer?.name ? (
                  <>
                    This issue is allotted to <strong>{issue.assignedOfficer.name}</strong>
                    {issue.assignedOfficer.region ? ` (${issue.assignedOfficer.region})` : ''}.
                    Only the assigned officer can update this issue.
                  </>
                ) : (
                  <>This issue is currently unassigned to you. Only the allotted officer or administrator can take action.</>
                )}
              </p>
            )}
            {issue.status === 'Pending Verification' && (
              <p>
                <strong className="font-semibold text-purple-700">Awaiting Admin Verification:</strong> The resolution proof has been submitted. The municipal administrator must verify the proof before closure.
              </p>
            )}
            {issue.status === 'Unsatisfied' && (
              <p>
                <strong className="font-semibold text-rose-700">Citizen Unsatisfied:</strong> The reporter was unsatisfied with the fix. Awaiting administrator review to reopen.
              </p>
            )}
            {(issue.status === 'Resolved' || issue.status === 'Closed') && (
              <p>
                <strong className="font-semibold text-emerald-700">Issue Resolved / Closed:</strong> No further action is required.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-ink-muted hover:bg-canvas transition-colors"
          >
            Cancel
          </button>
          {mode !== 'info' && (
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {saving
                ? 'Processing…'
                : mode === 'report_resolution'
                ? 'Submit Resolution Proof'
                : mode === 'verify'
                ? 'Confirm Decision'
                : mode === 'reopen'
                ? 'Reopen Issue'
                : 'Update Status'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

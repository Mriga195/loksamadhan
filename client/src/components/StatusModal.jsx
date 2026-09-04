import { useState } from 'react';
import { apiFetch } from '../api';

// The UI half of hard rule 2: resolution requires a note or evidence.
//
// THE SERVER ENFORCES THIS INDEPENDENTLY, in PATCH /api/issues/:id/status. The disabled button
// below is a courtesy so the officer sees the requirement before submitting — it is NOT the
// mechanism. A curl with an empty note gets a 400 with or without this file. Do not "simplify"
// the server check away on the grounds that the form already blocks it.
// Mirrors server/constants.js STATUSES — there is no 'Rejected' state in this build.
const STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];

// Literal class strings — Tailwind scans source text, so `bg-${key}-50` generates nothing.
const PILL = {
  Submitted: 'bg-submitted-50 text-submitted-600',
  Acknowledged: 'bg-acknowledged-50 text-acknowledged-600',
  'In Progress': 'bg-progress-50 text-progress-600',
  Resolved: 'bg-resolved-50 text-resolved-600',
};

export default function StatusModal({ issue, onClose, onSaved }) {
  const [status, setStatus] = useState(issue.status);
  const [note, setNote] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const resolving = status === 'Resolved';
  const blocked = resolving && !note.trim() && !evidence;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      // Multipart because evidence may be a file. The server reads note/status from the same
      // form body either way.
      const form = new FormData();
      form.append('status', status);
      form.append('note', note);
      if (evidence) form.append('evidence', evidence);

      // FormData: api.js deliberately omits Content-Type so the browser sets the boundary.
      const updated = await apiFetch(`/api/issues/${issue._id}/status`, {
        method: 'PATCH',
        body: form,
      });
      onSaved?.(updated);
      onClose();
    } catch (err) {
      setError(err.message);          // rendered verbatim — the server writes the user-facing copy
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-card bg-surface p-6 shadow-lg"
      >
        <h2 className="text-xl font-semibold">Update status</h2>
        <p className="mt-1 truncate text-sm text-ink-muted">{issue.title}</p>

        {/* What has already been said, so the officer does not repeat it. */}
        {issue.statusHistory?.length > 0 && (
          <ol className="mt-4 space-y-2 border-l border-line pl-4 text-sm">
            {issue.statusHistory.map((h, i) => (
              <li key={i}>
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${PILL[h.status] || ''}`}>
                  {h.status}
                </span>
                <span className="ml-2 text-xs text-ink-muted">
                  {new Date(h.at).toLocaleString()}
                </span>
                {h.note && <p className="mt-1 text-ink-muted">{h.note}</p>}
              </li>
            ))}
          </ol>
        )}

        <label className="mt-5 block text-sm font-medium">
          New status
          <select
            className="mt-1 w-full rounded border border-line px-3 py-2"
            value={status}
            onChange={e => setStatus(e.target.value)}
          >
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium">
          Resolution note {resolving && <span className="text-rejected-600">*</span>}
          <textarea
            className="mt-1 w-full rounded border border-line px-3 py-2"
            rows={3}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={resolving ? 'What was done?' : 'Optional'}
          />
        </label>

        {/* Required-and-visible only when resolving — an upload field on every status change is
            noise the officer scrolls past. */}
        {resolving && (
          <label className="mt-2 block text-sm font-medium">
            Evidence photo (or a note above)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="mt-1 block w-full text-sm"
              onChange={e => setEvidence(e.target.files?.[0] || null)}
            />
          </label>
        )}

        {blocked && (
          <p className="mt-3 text-sm text-rejected-600">
            Resolving requires a note or an evidence photo.
          </p>
        )}
        {error && <p className="mt-3 text-sm text-rejected-600">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="submit"
            disabled={blocked || saving}
            className="rounded bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Update'}
          </button>
        </div>
      </form>
    </div>
  );
}

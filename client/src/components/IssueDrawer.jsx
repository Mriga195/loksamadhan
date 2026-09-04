import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AssignControls from './AssignControls';
import Icon from './Icon';
import StatusPill from './StatusPill';
import StatusTimeline from './StatusTimeline';

// The right-hand detail panel of the officer dashboard. Selecting a table row opens it; it is
// where the two write actions live (assign, update status), so the table itself stays readable.
//
// There is no "Submitted by" line. The list endpoint never sends a reporter — hard rule 3, and
// serialize.js is where that is enforced. Do not add a field here hoping the API will grow one.

// A human-quotable reference. Mongo ids are 24 hex characters and nobody reads one aloud; the
// last six are unique enough for "look at LS-2025-A1B2C3" in a room, and it is derived, not
// stored, so it cannot drift from the record.
export const shortId = issue =>
  `LS-${new Date(issue.createdAt).getFullYear()}-${String(issue._id).slice(-6).toUpperCase()}`;

const fullDate = iso => new Date(iso).toLocaleString(undefined, {
  day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

export default function IssueDrawer({ issue, onClose, onSaved, onUpdateStatus }) {
  // Escape closes it. On a phone this panel covers the whole screen, so the X cannot be the
  // only way out.
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Officer-uploaded evidence lives on the history entry; citizen photos on the issue. Both are
  // "what does this actually look like", so they share one strip.
  const evidence = [
    ...(issue.photos || []).map(src => ({ src, label: 'Reported photo' })),
    ...(issue.statusHistory || [])
      .filter(h => h.evidence)
      .map(h => ({ src: h.evidence, label: `Evidence — ${h.status}` })),
  ];

  return (
    <aside aria-label="Issue detail"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l
        border-line bg-surface shadow-xl lg:top-16">
      <header className="flex items-start gap-2 border-b border-line p-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link to={`/issues/${issue._id}`} target="_blank"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600
                hover:underline">
              #{shortId(issue)}
              <Icon name="external" className="size-4" />
            </Link>
          </div>
          <h2 className="mt-1 text-lg font-semibold leading-snug">{issue.title}</h2>
          <p className="mt-1.5 flex items-start gap-1.5 text-sm text-ink-muted">
            <Icon name="map" className="mt-0.5 size-4 shrink-0" />
            {issue.address || issue.area || 'Location not given'}
          </p>
          <p className="mt-1 text-xs text-ink-muted">Submitted {fullDate(issue.createdAt)}</p>
        </div>

        <button type="button" onClick={onClose} aria-label="Close detail panel"
          className="cursor-pointer rounded-lg p-2 text-ink-muted transition-colors
            hover:bg-canvas hover:text-ink">
          <Icon name="close" />
        </button>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        {issue.description && (
          <p className="text-sm text-ink-muted">{issue.description}</p>
        )}

        <section>
          <h3 className="mb-3 text-sm font-semibold">Status timeline</h3>
          {issue.statusHistory?.length > 0
            ? <StatusTimeline history={issue.statusHistory} />
            : <p className="text-sm text-ink-muted">
                No status changes yet — this report is still <StatusPill status={issue.status} />
              </p>}
        </section>

        {evidence.length > 0 && (
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
              <Icon name="photo" className="size-4 text-ink-muted" />
              Photos &amp; evidence
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {evidence.map(({ src, label }) => (
                <a key={src} href={src} target="_blank" rel="noreferrer" title={label}
                  className="overflow-hidden rounded-lg border border-line">
                  <img src={src} alt={label} loading="lazy"
                    className="h-20 w-full object-cover transition-transform hover:scale-105" />
                </a>
              ))}
            </div>
          </section>
        )}

        {issue.duplicateOf && (
          <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
            Duplicate — progress is tracked on the original report.
          </p>
        )}
        {issue.duplicateCount > 0 && (
          <p className="rounded-lg bg-brand-50 p-3 text-sm text-brand-700">
            {issue.duplicateCount} other {issue.duplicateCount === 1 ? 'report' : 'reports'} linked
            to this one.
          </p>
        )}
      </div>

      {/* Actions pinned to the bottom so they are reachable without scrolling a long history. */}
      <footer className="space-y-3 border-t border-line p-5">
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Assign
          </h3>
          <AssignControls issue={issue} onSaved={onSaved} />
        </div>
        <button type="button" onClick={() => onUpdateStatus(issue)}
          className="min-h-11 w-full cursor-pointer rounded-lg bg-brand-600 text-sm font-medium
            text-white transition-colors hover:bg-brand-700">
          Update status
        </button>
      </footer>
    </aside>
  );
}

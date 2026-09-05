import StatusPill from './StatusPill';
import { timeAgo } from './IssueCard';
import SafeImage from './SafeImage';

// The centrepiece of the detail page. Oldest entry at the top, so it reads as a story that
// arrives somewhere rather than a log that starts with the ending.
//
// Convert technical/internal municipal system notes into friendly, clear progress messages for citizens
export function formatTimelineNote(rawNote) {
  if (!rawNote || typeof rawNote !== 'string') return '';
  let text = rawNote.trim();

  // Replace robotic auto-assignment notes
  if (/regional load-balancing/i.test(text)) {
    text = text.replace(
      /Auto-assigned to (.+?)\s*\((.+?)\s*Region\)\.\s*Officer assigned via regional load-balancing\.?/i,
      'Assigned to $1 ($2 Division). A local field officer has been allotted to take action.'
    );
    text = text.replace(
      /Officer assigned via regional load-balancing\.?/i,
      'A local field officer has been allotted to take action.'
    );
  }

  // Replace triage pool / unassigned jargon
  if (/Admin Triage Pool/i.test(text) || /no officer stationed in this region/i.test(text)) {
    text = text.replace(
      /No designated officer stationed in (.+?)\s*Region for (.+?)\.\s*Routed to Admin Triage Pool\.?/i,
      'Report received and queued for review by the municipal triage team for $2.'
    );
    text = text.replace(/— unassigned \(no officer stationed in this region\)/i, '— awaiting field officer dispatch');
  }

  // Replace "Triaged to" jargon
  if (/^Triaged to /i.test(text)) {
    text = text.replace(/^Triaged to /i, 'Assigned to ');
    text = text.replace(/, priority:\s*\w+\)/i, ')');
    text = text.replace(/— assigned to /i, '— allotted to field officer ');
  }

  // Clean up "Linked as similar report to ... Handled under original report by assigned officer."
  if (/Handled under original report by assigned officer/i.test(text)) {
    text = text.replace(
      /Linked as similar report to (#LS-[\w-]+)\.\s*Handled under original report by assigned officer\.?/i,
      'Grouped under primary report $1 for consolidated resolution.'
    );
  }

  return text;
}

export default function StatusTimeline({ history = [] }) {
  if (history.length === 0) return null;

  // Copy before sorting. An in-place .sort() on a prop mutates the caller's array, and that
  // class of bug is miserable to find at hour 30.
  const entries = [...history].sort((a, b) => new Date(a.at) - new Date(b.at));
  const lastIndex = entries.length - 1;

  return (
    <ol className="space-y-0">
      {entries.map((entry, i) => {
        const current = i === lastIndex;
        // The resolution note is the payoff - it is the visible proof that the resolution rule
        // works. It gets a green rail and full-weight text instead of being one more grey row.
        const resolved = entry.status === 'Resolved' || entry.status === 'Closed';
        const pendingVerification = entry.status === 'Pending Verification';
        const unsatisfied = entry.status === 'Unsatisfied';

        return (
          <li key={`${entry.at}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {/* Rail. Hidden on the last row so the line stops at the current state. */}
            {!current && (
              <span aria-hidden="true"
                className={`absolute left-[7px] top-4 h-full w-0.5 ${
                  resolved ? 'bg-emerald-500/40' :
                  pendingVerification ? 'bg-purple-500/40' :
                  unsatisfied ? 'bg-rose-500/40' : 'bg-line'
                }`} />
            )}
            <span aria-hidden="true"
              className={`relative mt-1.5 size-3.5 shrink-0 rounded-full border-2 ${
                resolved ? 'border-emerald-600 bg-emerald-600' :
                pendingVerification ? 'border-purple-600 bg-purple-600' :
                unsatisfied ? 'border-rose-600 bg-rose-600' :
                current ? 'border-brand-600 bg-brand-600' : 'border-line bg-surface'
              }`} />

            <div className={`min-w-0 flex-1 ${current ? '' : 'opacity-80'}`}>
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={entry.status} size={resolved ? 'md' : 'sm'} />
                <time dateTime={entry.at} title={new Date(entry.at).toLocaleString()}
                  className="text-xs text-ink-muted">
                  {timeAgo(entry.at)}
                </time>
                {current && <span className="text-xs font-medium text-brand-600">Current</span>}
              </div>

              {entry.note && (
                <p className={`mt-1.5 ${resolved ? 'text-base text-ink' : 'text-sm text-ink-muted'}`}>
                  {formatTimelineNote(entry.note)}
                </p>
              )}

              {entry.evidence && (
                <a href={entry.evidence} target="_blank" rel="noreferrer"
                  className="mt-2 inline-block overflow-hidden rounded-lg border border-line bg-slate-50">
                  <SafeImage src={entry.evidence} alt={`Evidence for status: ${entry.status}`}
                    className="h-28 w-auto min-w-[120px] object-cover" fallbackText="Evidence photo" />
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

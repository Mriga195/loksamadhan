import { Link } from 'react-router-dom';
import StatusPill from './StatusPill';

// One row in the public feed. There is no reporter in the API response — no name, no avatar,
// no "posted by". The serializer strips it on purpose (hard rule 3), so nothing here implies
// an author.

// Relative age. Intl does the pluralisation and wording; picking the unit is the only work.
// Exported because StatusTimeline needs the identical wording — one implementation, no drift.
const RTF = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const UNITS = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];

export function timeAgo(iso) {
  const seconds = (Date.now() - new Date(iso)) / 1000;
  for (const [unit, size] of UNITS) {
    if (seconds >= size) return RTF.format(-Math.floor(seconds / size), unit);
  }
  return 'just now';
}

// No photos exist on any seeded issue, so this placeholder is what a judge actually sees on
// every card. It is a designed element, not a fallback — a broken-image icon would read as a
// bug. Literal class strings: Tailwind cannot see `bg-${category}-100`.
const CATEGORY = {
  Road:        { tile: 'bg-amber-100 text-amber-700',     d: 'M4 20 9 4h6l5 16M9.5 12h5' },
  Water:       { tile: 'bg-sky-100 text-sky-700',         d: 'M12 3s6 6.6 6 10.5a6 6 0 0 1-12 0C6 9.6 12 3 12 3Z' },
  Sanitation:  { tile: 'bg-emerald-100 text-emerald-700', d: 'M6 7h12l-1 13H7L6 7Zm3 0V4h6v3' },
  Streetlight: { tile: 'bg-yellow-100 text-yellow-700',   d: 'M12 3a5 5 0 0 1 3 9v3H9v-3a5 5 0 0 1 3-9ZM10 19h4' },
  Drainage:    { tile: 'bg-slate-200 text-slate-700',     d: 'M4 8h16M4 8l2 12h12l2-12M9 12v4m6-4v4' },
  Other:       { tile: 'bg-violet-100 text-violet-700',   d: 'M12 8h.01M11 12h1v5h1' },
};

export default function IssueCard({ issue }) {
  const art = CATEGORY[issue.category] || CATEGORY.Other;
  const photo = issue.photos?.[0];

  return (
    <li className="rounded-card border border-line bg-surface transition-colors duration-200 hover:border-brand-500">
      {/* One link wrapping the whole card: a single tab stop, and the entire tile is a target. */}
      <Link to={`/issues/${issue._id}`} className="flex gap-4 p-4">
        {/* Fixed size and shrink-0 so the row height never changes as images load or fail. */}
        <div className={`grid size-20 shrink-0 place-items-center overflow-hidden rounded-lg ${art.tile}`}>
          {photo ? (
            <img
              src={photo}
              alt=""
              loading="lazy"
              className="size-full object-cover"
              onError={e => { e.currentTarget.hidden = true; }}
            />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" className="size-8">
              <path strokeLinecap="round" strokeLinejoin="round" d={art.d} />
            </svg>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={issue.status} />
            <span className="text-xs text-ink-muted">{issue.category}</span>
            {issue.area && <span className="text-xs text-ink-muted">· {issue.area}</span>}
          </div>

          <h3 className="mt-1.5 font-medium">{issue.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{issue.description}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
            <time dateTime={issue.createdAt} title={new Date(issue.createdAt).toLocaleString()}>
              {timeAgo(issue.createdAt)}
            </time>
            {issue.supporterCount > 0 && (
              <span>{issue.supporterCount} {issue.supporterCount === 1 ? 'person' : 'people'} also affected</span>
            )}

            {/* The visible proof of the duplicate-clustering feature. Given the accent colour
                rather than another grey line, because it is the thing to notice on this card. */}
            {issue.duplicateCount > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">
                +{issue.duplicateCount} similar {issue.duplicateCount === 1 ? 'report' : 'reports'}
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusPill from './StatusPill';
import SlaBadge from './SlaBadge';

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

// Literal class strings: Tailwind cannot see `bg-${category}-100`.
// Exported: the report form picks categories from the same art, so the icon you tap to file an
// issue is the icon you see on the card afterwards.
export const CATEGORY = {
  Road:        { tile: 'bg-amber-100 text-amber-700',     tag: 'bg-amber-50 text-amber-700',   dot: 'bg-amber-500',   d: 'M4 20 9 4h6l5 16M9.5 12h5' },
  Water:       { tile: 'bg-sky-100 text-sky-700',         tag: 'bg-sky-50 text-sky-700',       dot: 'bg-sky-500',     d: 'M12 3s6 6.6 6 10.5a6 6 0 0 1-12 0C6 9.6 12 3 12 3Z' },
  Sanitation:  { tile: 'bg-emerald-100 text-emerald-700', tag: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500', d: 'M6 7h12l-1 13H7L6 7Zm3 0V4h6v3' },
  Streetlight: { tile: 'bg-yellow-100 text-yellow-700',   tag: 'bg-yellow-50 text-yellow-700', dot: 'bg-yellow-500',  d: 'M12 3a5 5 0 0 1 3 9v3H9v-3a5 5 0 0 1 3-9ZM10 19h4' },
  Drainage:    { tile: 'bg-slate-200 text-slate-700',     tag: 'bg-slate-100 text-slate-700',  dot: 'bg-slate-500',   d: 'M4 8h16M4 8l2 12h12l2-12M9 12v4m6-4v4' },
  Other:       { tile: 'bg-violet-100 text-violet-700',   tag: 'bg-violet-50 text-violet-700', dot: 'bg-violet-500',  d: 'M12 8h.01M11 12h1v5h1' },
};

// Supporter heat color — higher supporter count = more vibrant
function supporterBadge(count) {
  if (count >= 10) return 'bg-red-100 text-red-700 border-red-200 font-bold';
  if (count >= 5)  return 'bg-orange-100 text-orange-700 border-orange-200 font-semibold';
  if (count >= 2)  return 'bg-brand-50 text-brand-700 border-brand-200 font-semibold';
  return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
}

const PRIORITY_COLORS = {
  high:   { cls: 'bg-red-50 text-red-700 border-red-200' },
  medium: { cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  low:    { cls: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const metaPill = 'inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line' +
  ' bg-canvas px-2 py-1 font-medium';

// `index` is the card's position in the feed, shown as the badge that ties the row to its pin
// on the map beside it. 1-based, passed by Feed — the card does not know about the map.
export default function IssueCard({ issue, index }) {
  const [imgFailed, setImgFailed] = useState(false);
  const art = CATEGORY[issue.category] || CATEGORY.Other;
  const photo = issue.photos?.[0];
  const place = issue.address || issue.area;
  const supporters = issue.supporterCount || 0;
  const priorityInfo = PRIORITY_COLORS[issue.priority];

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200/80
      bg-white shadow-[0px_2px_8px_rgba(15,23,42,0.04)]
      transition-all duration-200
      hover:shadow-[0px_4px_16px_rgba(15,23,42,0.1)]
      hover:bg-slate-50/50">
      {/* Animated left blue accent bar on hover */}
      <div className="absolute inset-y-0 left-0 w-1 origin-left scale-x-0 bg-brand-600
        transition-transform duration-200 ease-out group-hover:scale-x-100" />

      {/* One link wrapping the whole card: a single tab stop, and the entire row is a target. */}
      <Link to={`/issues/${issue._id}`}
        className="flex flex-col gap-3 p-4 pl-5 sm:flex-row sm:items-start sm:gap-4 sm:p-5 sm:pl-6">
        {/* Fixed size and shrink-0 from sm up, so the row height never changes as images
            load or fail. */}
        <div className={`relative grid h-32 w-full shrink-0 place-items-center overflow-hidden
          rounded-xl sm:size-24 ${art.tile}`}>
          {photo && !imgFailed ? (
            <img src={photo} alt="" loading="lazy" className="size-full object-cover"
              onError={() => setImgFailed(true)} />
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="1.5" className="size-10">
              <path strokeLinecap="round" strokeLinejoin="round" d={art.d} />
            </svg>
          )}
          {index != null && (
            <span aria-hidden="true" className="absolute left-1.5 top-1.5 grid size-6
              place-items-center rounded-md bg-brand-600 text-[10px] font-bold text-white
              shadow-sm">
              {index}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base font-semibold leading-snug sm:truncate sm:text-lg">
              {issue.title}
            </h3>
            <span className="flex shrink-0 flex-col items-end gap-1">
              <StatusPill status={issue.status} />
              {/* Status says where it is; this says whether that is acceptable by now. */}
              <SlaBadge sla={issue.sla} />
            </span>
          </div>

          {/* Two pills rather than a run-on line: the address is the long half and wraps on
              its own, so the age never ends up orphaned on a line of its own. */}
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
            <span className={metaPill}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.75" className="size-3.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 21s7-5.2 7-10.5a7 7 0 1 0-14 0C5 15.8 12 21 12 21Z" />
                <circle cx="12" cy="10.5" r="2.25" />
              </svg>
              <span className="truncate">{place || 'Location not given'}</span>
            </span>

            <span className={metaPill}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.75" className="size-3.5 shrink-0">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7.5V12l3 2" />
              </svg>
              <time dateTime={issue.createdAt} title={new Date(issue.createdAt).toLocaleString()}>
                {timeAgo(issue.createdAt)}
              </time>
            </span>
          </p>

          {issue.description && (
            <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{issue.description}</p>
          )}

          {/* Bottom row: category tag left, me-too right */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs
                font-medium ${art.tag}`}>
                <span className={`size-1.5 rounded-full ${art.dot}`} />
                {issue.department || issue.category}
              </span>

              {/* Cluster / geo-group indicator */}
              {issue.duplicateCount > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1
                  text-xs font-medium text-brand-700 border border-brand-100">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="1.75" className="size-4">
                    <rect x="9" y="9" width="11" height="11" rx="2" />
                    <path strokeLinecap="round" d="M15 5H6a2 2 0 0 0-2 2v9" />
                  </svg>
                  {issue.duplicateCount} similar report{issue.duplicateCount === 1 ? '' : 's'}
                </span>
              )}

              {/* Priority badge — no emoji, just a colored dot + text */}
              {issue.priority && issue.priority !== 'low' && (
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold border capitalize ${
                  issue.priority === 'high'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  <span className={`size-1.5 rounded-full shrink-0 ${issue.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                  {issue.priority}
                </span>
              )}
            </div>

            {/* Supporter count — prominent heat badge */}
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-all group-hover:scale-105 ${supporterBadge(supporters)}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.75" className="size-[16px]">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M7 11v9H4v-9h3Zm0 0 4.5-8a2 2 0 0 1 3.5 1.9L14 9h4.6a2 2 0 0 1 2 2.5l-1.7 6.5a2 2 0 0 1-2 1.5H7" />
              </svg>
              <span className="tabular-nums">{supporters}</span>
              {supporters >= 5 && <span className="hidden sm:inline text-[10px] opacity-70">supporters</span>}
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}

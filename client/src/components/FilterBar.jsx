import { useEffect, useState } from 'react';

// Mirrors server/constants.js. The server validates every one of these and 400s on an unknown
// value, so a drifted list here surfaces as a visible error rather than a silent wrong result.
const CATEGORIES = ['Road', 'Water', 'Sanitation', 'Streetlight', 'Drainage', 'Other'];
const DEPARTMENTS = [
  'Roads & Infrastructure', 'Water Supply & Sewage', 'Solid Waste Management',
  'Electricity & Lighting', 'Public Health & Drainage', 'General Administration',
];

// Status is the filter people reach for first, so it is chips (one click, always visible)
// rather than a fifth dropdown. Dot colour matches StatusPill — same tokens.
const STATUSES = [
  ['', 'All', ''],
  ['Submitted', 'Submitted', 'bg-submitted-600'],
  ['Acknowledged', 'Acknowledged', 'bg-acknowledged-600'],
  ['In Progress', 'In Progress', 'bg-progress-600'],
  ['Resolved', 'Resolved', 'bg-resolved-600'],
];

const control = 'min-h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink';

export default function FilterBar({ value, onChange, onClear }) {
  const [text, setText] = useState(value.q || '');

  // Debounced so typing does not fire a request per keystroke. Syncing back from `value` on
  // clear is what makes the Clear button empty this box too.
  useEffect(() => { setText(value.q || ''); }, [value.q]);
  useEffect(() => {
    if (text === (value.q || '')) return;
    const t = setTimeout(() => onChange('q', text), 300);
    return () => clearTimeout(t);
  }, [text]);   // eslint-disable-line react-hooks/exhaustive-deps

  const active = ['category', 'status', 'department', 'q'].filter(k => value[k]).length;

  return (
    <section aria-label="Filter issues" className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Status" className="flex flex-wrap items-center gap-2">
        {STATUSES.map(([val, label, dot]) => {
          const on = (value.status || '') === val;
          return (
            <button key={label} type="button" onClick={() => onChange('status', val)}
              aria-pressed={on}
              className={`inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full
                border px-4 text-sm transition-colors duration-200 ${on
                  ? 'border-brand-600 bg-brand-50 font-medium text-brand-700'
                  : 'border-line bg-surface text-ink hover:bg-canvas'}`}>
              {dot && <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />}
              {label}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <select aria-label="Category" className={`${control} cursor-pointer`}
          value={value.category || ''} onChange={e => onChange('category', e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select aria-label="Department" className={`${control} cursor-pointer`}
          value={value.department || ''} onChange={e => onChange('department', e.target.value)}>
          <option value="">All Departments</option>
          {DEPARTMENTS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <div className="relative">
          <input type="search" aria-label="Search" placeholder="Search issues, locations…"
            value={text} onChange={e => setText(e.target.value)}
            className={`${control} w-full pr-10 sm:w-72`} />
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.75"
            className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-ink-muted">
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" d="m16.5 16.5 4 4" />
          </svg>
        </div>

        {active > 0 && (
          <button type="button" onClick={onClear}
            className="min-h-9 cursor-pointer rounded-lg px-2 text-sm font-medium text-brand-600
              hover:bg-canvas">
            Clear
          </button>
        )}
      </div>
    </section>
  );
}

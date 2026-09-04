import { useEffect, useState } from 'react';

// Mirrors server/constants.js. The server validates every one of these and 400s on an unknown
// value, so a drifted list here surfaces as a visible error rather than a silent wrong result.
const CATEGORIES = ['Road', 'Water', 'Sanitation', 'Streetlight', 'Drainage', 'Other'];
const STATUSES = ['Submitted', 'Acknowledged', 'In Progress', 'Resolved'];
const DEPARTMENTS = [
  'Roads & Infrastructure', 'Water Supply & Sewage', 'Solid Waste Management',
  'Electricity & Lighting', 'Public Health & Drainage', 'General Administration',
];

const control = 'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm';

function Select({ label, name, options, value, onChange }) {
  return (
    <label className="block text-xs font-medium text-ink-muted">
      {label}
      <select className={`${control} mt-1 cursor-pointer`} value={value || ''}
        onChange={e => onChange(name, e.target.value)}>
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

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
    <section aria-label="Filter issues"
      className="rounded-card border border-line bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs font-medium text-ink-muted">
          Search
          <input type="search" placeholder="pothole, water supply…" value={text}
            onChange={e => setText(e.target.value)} className={`${control} mt-1`} />
        </label>
        <Select label="Category" name="category" options={CATEGORIES} value={value.category} onChange={onChange} />
        <Select label="Status" name="status" options={STATUSES} value={value.status} onChange={onChange} />
        <Select label="Department" name="department" options={DEPARTMENTS} value={value.department} onChange={onChange} />
      </div>

      {/* Kept in the layout at all times so appearing does not shift the grid above it. */}
      <div className="mt-3 flex min-h-6 items-center justify-between text-xs text-ink-muted">
        <span>{active > 0 ? `${active} filter${active > 1 ? 's' : ''} applied` : 'Showing all reports'}</span>
        {active > 0 && (
          <button type="button" onClick={onClear}
            className="cursor-pointer rounded px-2 py-1 font-medium text-brand-600 hover:bg-canvas">
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { useLang } from '../LangContext';

const CATEGORIES = ['Road', 'Water', 'Sanitation', 'Streetlight', 'Drainage', 'Other'];
const DEPARTMENTS = [
  'Roads & Infrastructure', 'Water Supply & Sewage', 'Solid Waste Management',
  'Electricity & Lighting', 'Public Health & Drainage', 'General Administration',
];

const STATUSES = [
  ['', 'All', ''],
  ['Submitted', 'Pending', 'bg-submitted-600'],
  ['Acknowledged', 'Acknowledged', 'bg-acknowledged-600'],
  ['In Progress', 'In Progress', 'bg-progress-600'],
  ['Pending Verification', 'Verification', 'bg-purple-600'],
  ['Resolved', 'Resolved', 'bg-resolved-600'],
  ['Closed', 'Closed', 'bg-emerald-600'],
  ['Rejected', 'Rejected', 'bg-red-600'],
];

const EN = {
  searchPlaceholder: 'Search issues, locations\u2026',
  allStatuses: 'All statuses',
  category: 'Category',
  department: 'Department',
  clear: 'Clear',
};

const STATUS_LABELS_EN = STATUSES.map(([, label]) => label);

const control = 'h-11 rounded-lg border border-line bg-surface px-3 text-sm text-ink';
const dropdown = `${control} w-full cursor-pointer sm:w-48`;

export default function FilterBar({ value, onChange, onClear }) {
  const { lang, translate } = useLang();
  const [text, setText] = useState(value.q || '');
  const [t, setT] = useState(EN);
  const [statusLabels, setStatusLabels] = useState(STATUS_LABELS_EN);

  useEffect(() => { setText(value.q || ''); }, [value.q]);
  useEffect(() => {
    if (text === (value.q || '')) return;
    const timer = setTimeout(() => onChange('q', text), 300);
    return () => clearTimeout(timer);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (lang === 'en') { setT(EN); setStatusLabels(STATUS_LABELS_EN); return; }
    const all = [...Object.values(EN), ...STATUS_LABELS_EN];
    translate(all).then(vals => {
      const n = Object.keys(EN).length;
      setT(Object.fromEntries(Object.keys(EN).map((k, i) => [k, vals[i]])));
      setStatusLabels(vals.slice(n));
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = ['category', 'status', 'department', 'q'].filter(k => value[k]).length;

  return (
    <section aria-label="Filter issues" className="mt-6">
      <div role="group" aria-label="Status" className="hidden flex-wrap items-center gap-2 sm:flex">
        {STATUSES.map(([val, , dot], idx) => {
          const label = statusLabels[idx];
          const on = (value.status || '') === val;
          return (
            <button key={val || 'all'} type="button" onClick={() => onChange('status', val)}
              aria-pressed={on}
              className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-all duration-200 ${on ? 'border-brand-600 bg-brand-600 font-medium text-white shadow-sm' : 'border-line bg-surface text-ink hover:bg-canvas hover:border-slate-300'}`}>
              {dot && <span aria-hidden="true" className={`size-2 rounded-full ${on ? 'bg-white/80' : dot}`} />}
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:mt-4">
        <div className="relative flex-1 min-w-[180px]">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-ink-muted">
            <circle cx="11" cy="11" r="7" /><path strokeLinecap="round" d="m16.5 16.5 4 4" />
          </svg>
          <input type="search" aria-label="Search" placeholder={t.searchPlaceholder}
            value={text} onChange={e => setText(e.target.value)}
            className={`${control} w-full pl-10 pr-3`} />
        </div>

        <select aria-label="Status" className={`${dropdown} sm:hidden`}
          value={value.status || ''} onChange={e => onChange('status', e.target.value)}>
          {STATUSES.map(([val], idx) => (
            <option key={val || 'all'} value={val}>
              {val === '' ? t.allStatuses : statusLabels[idx]}
            </option>
          ))}
        </select>

        <select aria-label="Category" className={dropdown}
          value={value.category || ''} onChange={e => onChange('category', e.target.value)}>
          <option value="">{t.category}</option>
          {CATEGORIES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        <select aria-label="Department" className={dropdown}
          value={value.department || ''} onChange={e => onChange('department', e.target.value)}>
          <option value="">{t.department}</option>
          {DEPARTMENTS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {active > 0 && (
          <button type="button" onClick={onClear}
            className="h-11 cursor-pointer rounded-lg px-3 text-sm font-medium text-ink-muted hover:text-brand-600 hover:bg-canvas transition-colors">
            {t.clear}
          </button>
        )}
      </div>
    </section>
  );
}

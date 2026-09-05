// Status badge. Colours come from the tokens in index.css (submitted/acknowledged/progress/
// resolved/rejected), so the pill, the filter chips and the timeline cannot drift apart.
// Literal class strings — Tailwind cannot see `bg-${key}-50`.
const STYLE = {
  Submitted: 'bg-submitted-50 text-submitted-600 border border-slate-200',
  Pending: 'bg-submitted-50 text-submitted-600 border border-slate-200',
  Acknowledged: 'bg-acknowledged-50 text-acknowledged-600 border border-amber-200',
  'In Progress': 'bg-progress-50 text-progress-600 border border-blue-200',
  'Pending Verification': 'bg-purple-50 text-purple-700 border border-purple-200',
  Resolved: 'bg-resolved-50 text-resolved-600 border border-emerald-200',
  Closed: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
  Unsatisfied: 'bg-rose-50 text-rose-700 border border-rose-200',
  Rejected: 'bg-rejected-50 text-rejected-600 border border-red-200',
};

// `size` exists because StatusTimeline gives the resolved entry more weight than the rest.
const SIZE = { sm: 'px-2 py-0.5 text-xs', md: 'px-2.5 py-1 text-sm' };

export default function StatusPill({ status, size = 'sm', className = '' }) {
  const displayLabel = status === 'Submitted' ? 'Pending' : status;
  return (
    <span className={`inline-flex items-center rounded-full font-medium
      ${SIZE[size] || SIZE.sm} ${STYLE[status] || STYLE.Submitted} ${className}`}>
      {displayLabel}
    </span>
  );
}

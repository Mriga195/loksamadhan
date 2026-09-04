// Status badge. Colours come from the tokens in index.css (submitted/acknowledged/progress/
// resolved/rejected), so the pill, the filter chips and the timeline cannot drift apart.
// Literal class strings — Tailwind cannot see `bg-${key}-50`.
const STYLE = {
  Submitted: 'bg-submitted-50 text-submitted-600',
  Acknowledged: 'bg-acknowledged-50 text-acknowledged-600',
  'In Progress': 'bg-progress-50 text-progress-600',
  Resolved: 'bg-resolved-50 text-resolved-600',
  Rejected: 'bg-rejected-50 text-rejected-600',
};

export default function StatusPill({ status, className = '' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium
      ${STYLE[status] || STYLE.Submitted} ${className}`}>
      {status}
    </span>
  );
}

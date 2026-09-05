// How the deadline is doing. The server derives the state in lib/sla.js and ships it on every
// issue, so this only picks a colour and a phrase — there is no date maths on the client to
// disagree with the date maths on the server.
//
// `met` is deliberately silent by default: on a resolved issue, "fixed on time" is worth saying
// once on the detail page, but a green tick on every resolved card in the feed is wallpaper.
const STYLE = {
  overdue:    { cls: 'bg-rejected-50 text-rejected-600 border-red-200',        label: s => `${s.breachDays}d overdue` },
  'due-soon': { cls: 'bg-acknowledged-50 text-acknowledged-600 border-amber-200', label: s => `${s.daysLeft}d left` },
  'on-track': { cls: 'bg-slate-100 text-slate-600 border-slate-200',           label: s => `${s.daysLeft}d left` },
  missed:     { cls: 'bg-rejected-50 text-rejected-600 border-red-200',        label: s => `${s.breachDays}d late` },
  met:        { cls: 'bg-resolved-50 text-resolved-600 border-emerald-200',    label: () => 'On time' },
};

export default function SlaBadge({ sla, showMet = false, className = '' }) {
  if (!sla || !STYLE[sla.state]) return null;
  if (sla.state === 'met' && !showMet) return null;

  const { cls, label } = STYLE[sla.state];
  const urgent = sla.state === 'overdue' || sla.state === 'due-soon';

  return (
    <span
      title={`Target: ${sla.targetDays} days for this category`}
      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium
        ${cls} ${className}`}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.75" strokeLinecap="round" className="size-3.5 shrink-0">
        {urgent
          ? <><path d="M12 3 2 20h20L12 3Z" /><path d="M12 10v4m0 3v.01" /></>
          : <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></>}
      </svg>
      {label(sla)}
    </span>
  );
}

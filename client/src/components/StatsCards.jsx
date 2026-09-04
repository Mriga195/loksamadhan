import Icon from './Icon';

// The four headline metrics above the officer queue.
//
// Every number here — including the sparkline and the "vs last week" delta — is REPLAYED from
// the issues already on screen and their statusHistory. Nothing is a placeholder and nothing is
// a second API call. If a number looks wrong, the history is wrong; there is no fudge factor.
//
// ponytail: describes the issues the dashboard fetched (server caps a page at 100). At demo
// size that is every issue; past 100 it becomes "this page", so page the fetch if that day comes.

const DAY = 86400000;
const WINDOW = 14;              // sparkline length, in days
const RESOLVED_WINDOW = 7;      // "this week" means the trailing 7 days
const AVG_WINDOW = 30;          // avg resolution time is a trailing 30-day mean

// The status an issue was in at instant `t`, replayed from its history. null = did not exist.
// statusHistory is append-only and therefore already chronological.
function statusAt(issue, t) {
  if (new Date(issue.createdAt).getTime() > t) return null;
  let status = 'Submitted';
  for (const h of issue.statusHistory || []) {
    if (new Date(h.at).getTime() <= t) status = h.status;
  }
  return status;
}

// Last time it was marked Resolved, or null. `.pop()` on the filtered list: a re-opened and
// re-resolved issue counts from its latest resolution, which is the one that stuck.
function resolvedAt(issue) {
  const entry = (issue.statusHistory || []).filter(h => h.status === 'Resolved').pop();
  return entry ? new Date(entry.at).getTime() : null;
}

// End-of-day timestamps for the last WINDOW days, the newest clamped to now.
function dayPoints() {
  const now = Date.now();
  return Array.from({ length: WINDOW }, (_, i) => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    d.setDate(d.getDate() - (WINDOW - 1 - i));
    return Math.min(d.getTime(), now);
  });
}

// A line plus a faint area fill, normalised to its own range so a flat series is a flat line
// rather than noise. No chart library for four 100x30 sparklines.
function Spark({ values, className }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const step = 100 / Math.max(values.length - 1, 1);
  const at = (v, i) => `${(i * step).toFixed(1)} ${(26 - ((v - min) / span) * 22).toFixed(1)}`;
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${at(v, i)}`).join(' ');

  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"
      className={`mt-3 h-10 w-full ${className}`}>
      <path d={`${line} L100 30 L0 30 Z`} fill="currentColor" opacity="0.10" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5"
        vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

// Literal class strings. Tailwind scans source text, so `bg-${tone}-50` would generate nothing.
const TONES = {
  rose: { chip: 'bg-rose-50 text-rose-600', line: 'text-rose-500' },
  blue: { chip: 'bg-blue-50 text-blue-600', line: 'text-blue-500' },
  emerald: { chip: 'bg-emerald-50 text-emerald-600', line: 'text-emerald-500' },
  violet: { chip: 'bg-violet-50 text-violet-600', line: 'text-violet-500' },
};

// `downIsGood` flips the delta's colour, not its arrow: fewer open issues is good news, fewer
// resolved ones is not, and the arrow must still point the way the number actually moved.
function Card({ icon, tone, label, value, unit, delta, downIsGood, series }) {
  const t = TONES[tone];
  const rounded = Math.round(delta * 10) / 10;
  const good = rounded === 0 || (rounded < 0) === downIsGood;

  return (
    <article className="rounded-card border border-line bg-surface p-5">
      <div className="flex items-center gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-full ${t.chip}`}>
          <Icon name={icon} />
        </span>
        <h3 className="text-sm font-medium text-ink-muted">{label}</h3>
      </div>

      <p className="mt-3 text-3xl font-semibold tabular-nums">
        {value}
        {unit && <span className="ml-1.5 text-base font-normal text-ink-muted">{unit}</span>}
      </p>

      <p className="mt-1.5 flex items-center gap-1 text-xs text-ink-muted">
        <Icon name={rounded < 0 ? 'down' : 'up'}
          className={`size-3.5 ${good ? 'text-resolved-600' : 'text-rejected-600'}`} />
        <span className={`font-medium ${good ? 'text-resolved-600' : 'text-rejected-600'}`}>
          {Math.abs(rounded)}
        </span>
        vs last week
      </p>

      <Spark values={series} className={t.line} />
    </article>
  );
}

export default function StatsCards({ issues = [] }) {
  const points = dayPoints();
  const series = fn => points.map(fn);
  // Delta = today minus the same measurement seven days ago, from the same series.
  const weekDelta = s => s[s.length - 1] - s[s.length - 1 - RESOLVED_WINDOW];

  const open = series(t => issues.filter(i => {
    const s = statusAt(i, t);
    return s && s !== 'Resolved';
  }).length);

  const progress = series(t => issues.filter(i => statusAt(i, t) === 'In Progress').length);

  const resolved = series(t => issues.filter(i => {
    const r = resolvedAt(i);
    return r && r <= t && r > t - RESOLVED_WINDOW * DAY;
  }).length);

  const avgDays = series(t => {
    const done = issues.filter(i => {
      const r = resolvedAt(i);
      return r && r <= t && r > t - AVG_WINDOW * DAY;
    });
    if (done.length === 0) return 0;
    const total = done.reduce((sum, i) => sum + (resolvedAt(i) - new Date(i.createdAt)), 0);
    return total / done.length / DAY;
  });

  const last = s => s[s.length - 1];

  return (
    <section aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card icon="clipboard" tone="rose" label="Open" value={last(open)}
        delta={weekDelta(open)} downIsGood series={open} />
      <Card icon="wrench" tone="blue" label="In Progress" value={last(progress)}
        delta={weekDelta(progress)} downIsGood series={progress} />
      <Card icon="check" tone="emerald" label="Resolved this week" value={last(resolved)}
        delta={weekDelta(resolved)} series={resolved} />
      <Card icon="clock" tone="violet" label="Avg. resolution time"
        value={last(avgDays).toFixed(1)} unit="days"
        delta={weekDelta(avgDays)} downIsGood series={avgDays} />
    </section>
  );
}

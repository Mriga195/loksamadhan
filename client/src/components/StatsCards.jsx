import { Children, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api';
import Icon from './Icon';

// The four headline metrics above the queue and on the public landing page.
//
// When `issues` is provided with data, metrics are replayed from statusHistory.
// When rendered without issues (e.g. on the landing page), it fetches /api/stats
// from the server so all visitors see live global aggregates.

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
  const entry = (issue.statusHistory || []).filter(h => h.status === 'Resolved' || h.status === 'Closed').pop();
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
  if (!values || values.length === 0) return null;
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
    <article className="rounded-card border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-full sm:size-10 ${t.chip}`}>
          <Icon name={icon} />
        </span>
        <h3 className="text-xs font-medium leading-tight text-ink-muted sm:text-sm">{label}</h3>
      </div>

      <p className="mt-3 text-2xl font-semibold tabular-nums sm:text-3xl">
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


// Below sm the four cards are a one-at-a-time swipe deck: native scroll-snap does the paging,
// so there is no drag maths, no timers and no autoplay — the reader moves it or it stays put.
// From sm up the same children are just a grid.
function Deck({ label, children }) {
  const track = useRef(null);
  const [page, setPage] = useState(0);
  const count = Children.count(children);

  const goTo = (i) => {
    const el = track.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <section aria-label={label}>
      <div
        ref={track}
        onScroll={e => setPage(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto
          sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible xl:grid-cols-4"
      >
        {Children.map(children, child => (
          <div className="w-full shrink-0 snap-center sm:w-auto">{child}</div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-center gap-2 sm:hidden">
        {Array.from({ length: count }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => goTo(i)}
            aria-label={`Show card ${i + 1} of ${count}`}
            aria-current={i === page}
            className={`h-2 cursor-pointer rounded-full transition-all duration-200 ${
              i === page ? 'w-6 bg-brand-600' : 'w-2 bg-line'}`}
          />
        ))}
      </div>
    </section>
  );
}

export default function StatsCards({ issues }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(!issues || issues.length === 0);

  useEffect(() => {
    if (!issues || issues.length === 0) {
      let stale = false;
      setLoading(true);
      apiFetch('/api/stats')
        .then(data => {
          if (!stale) setStats(data);
        })
        .catch(err => {
          console.error('Failed to load stats:', err);
        })
        .finally(() => {
          if (!stale) setLoading(false);
        });
      return () => { stale = true; };
    }
  }, [issues]);

  // If we have an issues array with data, compute client-side
  if (issues && issues.length > 0) {
    const points = dayPoints();
    const series = fn => points.map(fn);
    const weekDelta = s => s[s.length - 1] - s[s.length - 1 - RESOLVED_WINDOW];

    const open = series(t => issues.filter(i => {
      const s = statusAt(i, t);
      return s && s !== 'Resolved' && s !== 'Closed';
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
      <Deck label="Summary">
        <Card icon="clipboard" tone="rose" label="Open" value={last(open)}
          delta={weekDelta(open)} downIsGood series={open} />
        <Card icon="wrench" tone="blue" label="In Progress" value={last(progress)}
          delta={weekDelta(progress)} downIsGood series={progress} />
        <Card icon="check" tone="emerald" label="Resolved this week" value={last(resolved)}
          delta={weekDelta(resolved)} series={resolved} />
        <Card icon="clock" tone="violet" label="Avg. resolution time"
          value={last(avgDays).toFixed(1)} unit="days"
          delta={weekDelta(avgDays)} downIsGood series={avgDays} />
      </Deck>
    );
  }

  // Loading skeleton
  if (loading && !stats) {
    return (
      <Deck label="Summary loading">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-card border border-line bg-surface p-5" />
        ))}
      </Deck>
    );
  }

  // Use server metrics from /api/stats
  const m = stats?.metrics;
  const openVal = m?.open?.value ?? (stats?.total ? stats.total - (stats.byStatus?.Resolved || 0) : 0);
  const openDelta = m?.open?.delta ?? 0;
  const openSeries = m?.open?.series ?? [openVal];

  const progVal = m?.progress?.value ?? (stats?.byStatus?.['In Progress'] || 0);
  const progDelta = m?.progress?.delta ?? 0;
  const progSeries = m?.progress?.series ?? [progVal];

  const resVal = m?.resolved?.value ?? (stats?.byStatus?.Resolved || 0);
  const resDelta = m?.resolved?.delta ?? 0;
  const resSeries = m?.resolved?.series ?? [resVal];

  const avgVal = m?.avgDays?.value ?? 0;
  const avgDelta = m?.avgDays?.delta ?? 0;
  const avgSeries = m?.avgDays?.series ?? [avgVal];

  return (
    <Deck label="Summary">
      <Card icon="clipboard" tone="rose" label="Open" value={openVal}
        delta={openDelta} downIsGood series={openSeries} />
      <Card icon="wrench" tone="blue" label="In Progress" value={progVal}
        delta={progDelta} downIsGood series={progSeries} />
      <Card icon="check" tone="emerald" label="Resolved this week" value={resVal}
        delta={resDelta} series={resSeries} />
      <Card icon="clock" tone="violet" label="Avg. resolution time"
        value={avgVal.toFixed(1)} unit="days"
        delta={avgDelta} downIsGood series={avgSeries} />
    </Deck>
  );
}

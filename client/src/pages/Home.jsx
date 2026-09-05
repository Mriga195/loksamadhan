import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api';
import { useLang } from '../LangContext';
import Icon from '../components/Icon';
import { CityScene, ReportScene, ResolvedScene, ShieldScene, TrackScene } from '../components/Illustrations';

// Public landing page at '/'. The feed itself lives at '/feed' — this page's job is to explain
// what the site is and get a visitor to one of two places: report something, or see what's
// already been reported.
//
// The counters are real numbers from the public API (auth(false)), not placeholders: one
// request per status, same GET /api/issues the feed already calls, just limit=1 for the total.
// If those requests fail the strip is dropped rather than shown with zeros — a landing page
// with no numbers still works, one with wrong numbers doesn't.
//
// Each stat keeps the colour its status already has in StatusPill (the tokens in index.css),
// so a status never means one colour here and another in the feed.

// Literal class strings — Tailwind cannot see `bg-${key}-50`, same reason StatusPill spells its map out.
const STATS_META = [
  { key: 'total',        icon: 'clipboard', tint: 'bg-brand-50 text-brand-600',              ink: 'text-brand-600' },
  { key: 'submitted',    icon: 'send',      tint: 'bg-submitted-50 text-submitted-600',       ink: 'text-submitted-600' },
  { key: 'acknowledged', icon: 'clock',     tint: 'bg-acknowledged-50 text-acknowledged-600', ink: 'text-acknowledged-600' },
  { key: 'inProgress',   icon: 'gear',      tint: 'bg-progress-50 text-progress-600',         ink: 'text-progress-600' },
  { key: 'resolved',     icon: 'check',     tint: 'bg-resolved-50 text-resolved-600',         ink: 'text-resolved-600' },
];

const EN = {
  heroTitle: 'Report a civic issue. Watch it get fixed — in public.',
  heroSub: 'Potholes, broken streetlights, uncollected garbage, water leaks. File it once, see it on the map, and follow every status change your municipality makes.',
  ctaReport: 'Report an Issue',
  ctaFeed: 'View public feed',
  howItWorks: 'How it works',
  stepReportTitle: 'Report',
  stepReportBody: 'Pin the location, add a photo, describe the issue. Takes under a minute.',
  stepTrackTitle: 'Track',
  stepTrackBody: 'Every report is public. Watch it move from Submitted to Resolved.',
  stepResolvedTitle: 'Resolved',
  stepResolvedBody: 'Closed only with a note or photo evidence from the department — never silently.',
  promise: 'What we promise',
  trust1: 'Similar reports are linked to the original, never deleted — your "+1" still counts.',
  trust2: 'A report can only be marked Resolved with a note or photo evidence attached.',
  trust3: 'Your name and contact details are never shown in a public report.',
  statTotal: 'Total reports',
  statSubmitted: 'Submitted',
  statAcknowledged: 'Acknowledged',
  statInProgress: 'In Progress',
  statResolved: 'Resolved',
};

export default function Home() {
  const { lang, translate } = useLang();
  const [counts, setCounts] = useState(null);
  const [t, setT] = useState(EN);

  useEffect(() => {
    if (lang === 'en') { setT(EN); return; }
    translate(Object.values(EN)).then((vals) => {
      setT(Object.fromEntries(Object.keys(EN).map((k, i) => [k, vals[i]])));
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let stale = false;
    Promise.all([
      apiFetch('/api/issues?limit=1'),
      apiFetch('/api/issues?limit=1&status=Submitted'),
      apiFetch('/api/issues?limit=1&status=Acknowledged'),
      apiFetch('/api/issues?limit=1&status=In%20Progress'),
      apiFetch('/api/issues?limit=1&status=Resolved'),
    ]).then(([total, submitted, acknowledged, inProgress, resolved]) => {
      if (stale) return;
      setCounts({
        total: total.total,
        submitted: submitted.total,
        acknowledged: acknowledged.total,
        inProgress: inProgress.total,
        resolved: resolved.total,
      });
    }).catch(() => {});
    return () => { stale = true; };
  }, []);

  const statLabels = [t.statTotal, t.statSubmitted, t.statAcknowledged, t.statInProgress, t.statResolved];

  const steps = [
    { title: t.stepReportTitle,   body: t.stepReportBody,   Scene: ReportScene },
    { title: t.stepTrackTitle,    body: t.stepTrackBody,    Scene: TrackScene },
    { title: t.stepResolvedTitle, body: t.stepResolvedBody, Scene: ResolvedScene },
  ];

  const trust = [t.trust1, t.trust2, t.trust3];

  return (
    <main>
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/50 to-canvas">
        <CityScene className="absolute inset-x-0 bottom-0 -z-10 h-[300px] w-full" />

        <div className="mx-auto max-w-3xl px-4 pt-14 text-center sm:pt-20">
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-[2.5rem]">
            {t.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-ink-muted">{t.heroSub}</p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
            <Link to="/report"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg
                bg-brand-600 px-6 text-sm font-medium text-white shadow-sm transition-colors
                duration-200 hover:bg-brand-700 sm:w-auto">
              <Icon name="plus" className="size-5" />
              {t.ctaReport}
            </Link>
            <Link to="/feed"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg
                border border-line bg-surface px-6 text-sm font-medium shadow-sm
                transition-colors duration-200 hover:bg-canvas sm:w-auto">
              <Icon name="clipboard" className="size-5" />
              {t.ctaFeed}
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:pb-20 sm:pt-14">
          {counts && (
            <dl className="grid grid-cols-2 gap-y-6 rounded-2xl border border-line bg-surface
              p-6 shadow-[0_10px_40px_rgba(15,23,42,0.08)] sm:grid-cols-5 sm:gap-0
              sm:divide-x sm:divide-line">
              {STATS_META.map(({ key, icon, tint, ink }, idx) => (
                <div key={key} className="flex flex-col items-center gap-2 px-2 text-center">
                  <span className={`grid size-11 place-items-center rounded-full ${tint}`}>
                    <Icon name={icon} />
                  </span>
                  <dt className="text-xs text-ink-muted">{statLabels[idx]}</dt>
                  <dd className={`text-2xl font-bold ${ink}`}>{counts[key]}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16">
        <h2 className="text-center text-xl font-semibold">{t.howItWorks}</h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map(({ title, body, Scene }, i) => (
            <div key={i}
              className="relative rounded-2xl border border-line bg-surface p-6 shadow-sm">
              <span className="absolute left-6 top-6 z-10 grid size-8 place-items-center
                rounded-full bg-brand-600 text-sm font-semibold text-white">
                {i + 1}
              </span>

              <div className="grid h-40 place-items-center rounded-xl bg-gradient-to-b
                from-brand-50/70 to-transparent">
                <Scene className="h-36 w-auto" />
              </div>

              <h3 className="mt-5 font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{body}</p>

              {i < steps.length - 1 && (
                <span aria-hidden="true"
                  className="absolute -right-6 top-1/2 hidden w-6 border-t-2 border-dashed
                    border-brand-200 sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="grid items-center gap-8 rounded-2xl border border-line
          bg-gradient-to-r from-resolved-50 to-surface p-8 sm:grid-cols-[220px_1fr]">
          <ShieldScene className="mx-auto h-40 w-auto" />

          <div>
            <h2 className="text-xl font-semibold">{t.promise}</h2>
            <ul className="mt-5 space-y-4">
              {trust.map((line, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-ink-muted">
                  <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full
                    bg-resolved-600 text-white">
                    <Icon name="tick" className="size-3.5" />
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

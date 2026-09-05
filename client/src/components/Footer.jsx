import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../LangContext';
import Icon from './Icon';
import Logo from './Logo';

// Site-wide footer. Lives in App.jsx, so every route under it (feed, report, issue detail,
// login/register, and now Home) gets the same one. Not shown on /dashboard — that route
// renders its own shell outside <App />, same reason it skips <Nav />.
//
// Every link here goes somewhere real: "Departments" deep-links into the tabs on the
// /departments page (Departments.jsx), which mirror the categories Report.jsx actually offers
// (Report.jsx:9). No social links, phone number, or legal pages — none of that exists in this
// app, and a footer full of dead links is worse than a short one.

const DEPARTMENTS = [
  { label: 'Water Supply', dept: 'water-supply', icon: 'droplet' },
  { label: 'Solid Waste Management', dept: 'solid-waste', icon: 'trash' },
  { label: 'Roads & Infrastructure', dept: 'roads', icon: 'map' },
  { label: 'Street Lighting', dept: 'street-lighting', icon: 'bulb' },
  { label: 'Parks & Gardens', dept: 'parks', icon: 'tree' },
];

const EN = {
  tagline: 'LokSamadhan is an initiative to empower citizens and strengthen civic services through technology and transparency.',
  explore: 'Explore',
  feed: 'Feed',
  reportIssue: 'Report an Issue',
  departments: 'Departments',
  viewAll: 'View all departments',
  promise: 'What we promise',
  p1: 'Similar reports are linked, never deleted.',
  p2: 'Resolution requires a note or evidence.',
  p3: 'Your personal info is never made public.',
  copyright: `© ${new Date().getFullYear()} LokSamadhan. Built for public accountability, not real municipal integration.`,
  // dept labels
  waterSupply: 'Water Supply',
  solidWaste: 'Solid Waste Management',
  roads: 'Roads & Infrastructure',
  streetLighting: 'Street Lighting',
  parks: 'Parks & Gardens',
};

const linkClass = 'flex items-center gap-2 hover:text-brand-600';

export default function Footer() {
  const { lang, translate } = useLang();
  const [t, setT] = useState(EN);

  useEffect(() => {
    if (lang === 'en') { setT(EN); return; }
    translate(Object.values(EN)).then((vals) => {
      setT(Object.fromEntries(Object.keys(EN).map((k, i) => [k, vals[i]])));
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // Translate dept labels
  const deptLabels = [t.waterSupply, t.solidWaste, t.roads, t.streetLighting, t.parks];

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold">
              <Logo />
              <span className="text-brand-600">Lok</span>Samadhan
            </Link>
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              LokSamadhan is an initiative to empower citizens and strengthen civic services
              through technology and transparency.
              {t.tagline}
            </p>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Explore
              {t.explore}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/feed" className={linkClass}>
                  <Icon name="home" className="size-[18px]" />
                  Feed
                  {t.feed}
                </Link>
              </li>
              <li>
                <Link to="/report" className={linkClass}>
                  <Icon name="plus" className="size-[18px]" />
                  Report an Issue
                  {t.reportIssue}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Departments">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t.departments}
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {DEPARTMENTS.map(({ dept, icon }, idx) => (
                <li key={dept}>
                  <Link to={`/departments?dept=${dept}`} className={linkClass}>
                    <Icon name={icon} className="size-[18px]" />
                    {deptLabels[idx]}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/departments" className={linkClass}>
                  <Icon name="building" className="size-[18px]" />
                  View all departments
                  {t.viewAll}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              What we promise
              {t.promise}
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-muted">
              <li>Similar reports are linked, never deleted.</li>
              <li>Resolution requires a note or evidence.</li>
              <li>Your personal info is never made public.</li>
              <li>{t.p1}</li>
              <li>{t.p2}</li>
              <li>{t.p3}</li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-muted">
          &copy; {new Date().getFullYear()} LokSamadhan. Built for public accountability, not
          real municipal integration.
          {t.copyright}
        </p>
      </div>
    </footer>
  );
}

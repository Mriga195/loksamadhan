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

// Rows on a real screen. On a phone they get a 44px target — a 20px text row is not something
// a thumb can hit at the very bottom of a page.
const linkClass = 'flex min-h-11 items-center gap-2 hover:text-brand-600 sm:min-h-0';

// Departments are chips below sm and rows from sm up. Six stacked rows of "Solid Waste
// Management" was a third of the footer's height on a phone; wrapped chips halve it.
const chipClass = 'inline-flex items-center gap-2 rounded-full border border-line bg-canvas' +
  ' px-3 py-2 hover:border-brand-200 hover:text-brand-600 sm:min-h-0 sm:rounded-none sm:border-0' +
  ' sm:bg-transparent sm:px-0 sm:py-0';

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
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 sm:gap-10 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold">
              <Logo />
              <span className="text-brand-600">Lok</span>Samadhan
            </Link>
            <p className="mt-2 max-w-xs text-sm text-ink-muted sm:mt-3">
              {t.tagline}
            </p>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t.explore}
            </h3>
            <ul className="mt-2 text-sm sm:mt-4 sm:space-y-3">
              <li>
                <Link to="/feed" className={linkClass}>
                  <Icon name="home" className="size-[18px]" />
                  {t.feed}
                </Link>
              </li>
              <li>
                <Link to="/report" className={linkClass}>
                  <Icon name="plus" className="size-[18px]" />
                  {t.reportIssue}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Departments">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t.departments}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm sm:mt-4 sm:flex-col sm:gap-3">
              {DEPARTMENTS.map(({ dept, icon }, idx) => (
                <li key={dept}>
                  <Link to={`/departments?dept=${dept}`} className={chipClass}>
                    <Icon name={icon} className="size-4 sm:size-[18px]" />
                    {deptLabels[idx]}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/departments"
                  className={`${chipClass} border-brand-200 bg-brand-50 font-medium text-brand-700`}>
                  <Icon name="building" className="size-4 sm:size-[18px]" />
                  {t.viewAll}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t.promise}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-muted sm:mt-4 sm:space-y-3">
              <li>{t.p1}</li>
              <li>{t.p2}</li>
              <li>{t.p3}</li>
            </ul>
          </div>
        </div>

        <p className="mt-8 border-t border-line pt-5 text-xs leading-relaxed text-ink-muted sm:mt-10 sm:pt-6">
          {t.copyright}
        </p>
      </div>
    </footer>
  );
}

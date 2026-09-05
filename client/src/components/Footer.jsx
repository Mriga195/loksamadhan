import { Link } from 'react-router-dom';
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

const linkClass = 'flex items-center gap-2 hover:text-brand-600';

export default function Footer() {
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
            </p>
          </div>

          <nav aria-label="Explore">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Explore
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li>
                <Link to="/feed" className={linkClass}>
                  <Icon name="home" className="size-[18px]" />
                  Feed
                </Link>
              </li>
              <li>
                <Link to="/report" className={linkClass}>
                  <Icon name="plus" className="size-[18px]" />
                  Report an Issue
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Departments">
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              Departments
            </h3>
            <ul className="mt-4 space-y-3 text-sm">
              {DEPARTMENTS.map(({ label, dept, icon }) => (
                <li key={dept}>
                  <Link to={`/departments?dept=${dept}`} className={linkClass}>
                    <Icon name={icon} className="size-[18px]" />
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/departments" className={linkClass}>
                  <Icon name="building" className="size-[18px]" />
                  View all departments
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h3 className="text-xs font-medium uppercase tracking-wide text-ink-muted">
              What we promise
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-muted">
              <li>Similar reports are linked, never deleted.</li>
              <li>Resolution requires a note or evidence.</li>
              <li>Your personal info is never made public.</li>
            </ul>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-xs text-ink-muted">
          &copy; {new Date().getFullYear()} LokSamadhan. Built for public accountability, not
          real municipal integration.
        </p>
      </div>
    </footer>
  );
}

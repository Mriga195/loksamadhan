import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import Icon from './Icon';
import Logo from './Logo';

// Site header. Routes match router.jsx exactly: '/' (landing), '/feed', '/departments',
// '/report', '/issues/:id', '/login', '/register'; '/dashboard' is a top-level route with its
// own shell.
//
// A floating rounded pill rather than a full-width bar — the requested look. Menu items are
// icon+label to match it, but the item SET is unchanged: only routes that exist. Not present,
// on purpose, because nothing behind them exists yet: "Track My Issue" (no per-reporter lookup
// endpoint — the API never returns who filed a report, by hard rule 3), "About" (no page),
// a notification bell (no notification system), and a city switcher (issues aren't scoped by
// city anywhere in the API). Faking any of those is worse than leaving them out.
//
// The nav shows only what the visitor can actually do:
//   signed out    — Feed, Departments, Report an issue, Log in, Sign up. Reporting is offered:
//                   the form is fillable signed-out and the login wall sits at submit.
//   citizen       — Feed, Departments, Report an issue, and who they are signed in as.
//   officer/admin — Feed, Departments, Dashboard, and who they are signed in as.
//
// Below md the same set collapses behind a hamburger. The panel is a plain block inside the
// nav card, not an overlay: it pushes the page down, so there is no scroll lock, no backdrop
// and no focus trap to get wrong. Escape and any navigation close it.

const item = ({ isActive }) =>
  'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200 ' +
  (isActive ? 'bg-brand-50 font-medium text-brand-600' : 'text-ink hover:bg-canvas');

const cta = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-600' +
  ' px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-700';

const outline = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border' +
  ' border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-200' +
  ' hover:bg-canvas hover:border-slate-300';

export default function Nav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, loading, logout } = useAuth();
  const isStaff = user?.role === 'officer' || user?.role === 'admin';

  const [open, setOpen] = useState(false);

  // Any navigation closes the panel — otherwise tapping "Feed" leaves the menu covering it.
  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = e => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login');
  };

  // The link set, rendered twice: inline on desktop, stacked in the panel.
  const links = (
    <>
      <NavLink to="/feed" className={item}>
        <Icon name="home" className="size-[18px]" />
        Feed
      </NavLink>

      <NavLink to="/departments" className={item}>
        <Icon name="building" className="size-[18px]" />
        Departments
      </NavLink>

      {isStaff && !loading && (
        <NavLink to="/dashboard" className={item}>
          <Icon name="dashboard" className="size-[18px]" />
          Dashboard
        </NavLink>
      )}
    </>
  );

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-4 pt-4">
      <nav
        aria-label="Main"
        className="pointer-events-auto mx-auto max-w-7xl rounded-2xl border border-line bg-surface px-3 py-2
          shadow-[0_2px_12px_rgba(15,23,42,0.06)] md:px-4 md:py-2.5"
      >
        <div className="flex items-center gap-2 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Link to="/" aria-label="LokSamadhan — home"
            className="inline-flex min-h-11 items-center md:mr-2">
            <Logo className="size-9 md:size-10" />
          </Link>

          <div className="hidden items-center gap-2 md:flex md:justify-self-center">{links}</div>

          <div className="ml-auto hidden items-center gap-2 md:flex md:justify-self-end">
            {/* While the token is being validated, render nothing here rather than flashing
                "Log in" at a user who is already signed in. The space is held by the row. */}
            {loading ? null : user ? (
              <>
                {!isStaff && (
                  <Link to="/report" className={cta}>
                    <Icon name="plus" className="size-[18px]" />
                    Report an Issue
                  </Link>
                )}

                <Link to="/profile" title="My Profile"
                  className="ml-1 flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-canvas">
                  <Avatar name={user.name} />
                  <span className="text-sm">
                    <span className="block font-medium leading-tight">{user.name}</span>
                    <span className="block text-xs capitalize text-ink-muted">{user.role}</span>
                  </span>
                </Link>

                <button type="button" onClick={handleLogout} title="Log out" aria-label="Log out"
                  className="cursor-pointer rounded-full p-2 text-ink-muted transition-colors
                    duration-200 hover:bg-canvas hover:text-ink">
                  <Icon name="logout" className="size-[18px]" />
                </button>
              </>
            ) : (
              <>
                <Link to="/report" className={cta}>
                  <Icon name="plus" className="size-[18px]" />
                  Report an Issue
                </Link>
                <NavLink to="/login" className={item}>Log in</NavLink>
                <Link to="/register" className={outline}>Sign up</Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="nav-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="ml-auto grid size-11 cursor-pointer place-items-center rounded-full
              text-ink transition-colors hover:bg-canvas md:hidden"
          >
            <Icon name={open ? 'close' : 'menu'} className="size-6" />
          </button>
        </div>

        {open && (
          <div id="nav-menu" className="mt-2 flex flex-col gap-1 border-t border-line pt-3 md:hidden">
            {links}

            <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
              {loading ? null : user ? (
                <>
                  {!isStaff && (
                    <Link to="/report" className={cta}>
                      <Icon name="plus" className="size-[18px]" />
                      Report an Issue
                    </Link>
                  )}

                  <Link to="/profile"
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-canvas">
                    <Avatar name={user.name} />
                    <span className="text-sm">
                      <span className="block font-medium leading-tight">{user.name}</span>
                      <span className="block text-xs capitalize text-ink-muted">{user.role}</span>
                    </span>
                  </Link>

                  <button type="button" onClick={handleLogout}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2
                      text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink">
                    <Icon name="logout" className="size-[18px]" />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/report" className={cta}>
                    <Icon name="plus" className="size-[18px]" />
                    Report an Issue
                  </Link>
                  <Link to="/register" className={outline}>Sign up</Link>
                  <NavLink to="/login" className={item}>Log in</NavLink>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

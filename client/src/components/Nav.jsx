import { Link, NavLink, useNavigate } from 'react-router-dom';
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
//   signed out    — Feed, Log in, Sign up. No "Report an issue": POST /api/issues is auth(true)
//                   and the form would just bounce them to login.
//   citizen       — Feed, Report an issue, and who they are signed in as.
//   officer/admin — Feed, Dashboard, and who they are signed in as.
//
// No JS dropdown behind the avatar. On narrow screens the row wraps onto a second line instead
// of collapsing behind a hamburger — fewer moving parts, nothing to trap focus in, and it
// cannot scroll sideways.

const item = ({ isActive }) =>
  'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200 ' +
  (isActive ? 'bg-brand-50 font-medium text-brand-600' : 'text-ink hover:bg-canvas');

const cta = 'inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm' +
  ' font-medium text-white transition-colors duration-200 hover:bg-brand-700';

const outline = 'inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-surface px-4 text-sm' +
  ' font-medium text-ink transition-colors duration-200 hover:bg-canvas hover:border-slate-300';

export default function Nav() {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const isStaff = user?.role === 'officer' || user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 px-4 pt-4">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-2 gap-y-2 rounded-2xl
          border border-line bg-surface px-4 py-2.5 shadow-[0_2px_12px_rgba(15,23,42,0.06)]"
      >
        <Link to="/" className="mr-2 inline-flex min-h-11 items-center gap-2 text-lg font-bold">
          <Logo />
          <span className="text-brand-600">Lok</span>Samadhan
        </Link>

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

        <div className="ml-auto flex items-center gap-2">
          {/* While the token is being validated, render nothing here rather than flashing
              "Log in" at a user who is already signed in. The space is held by the row itself. */}
          {loading ? null : user ? (
            <>
              {!isStaff && (
                <Link to="/report" className={cta}>
                  <Icon name="plus" className="size-[18px]" />
                  Report an Issue
                </Link>
              )}

              <Link to="/profile" className="ml-1 flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-canvas" title="My Profile">
                <Avatar name={user.name} />
                <span className="hidden text-sm sm:block">
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
              <NavLink to="/login" className={item}>Log in</NavLink>
              <Link to="/register" className={cta}>Sign up</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';
import Icon from './Icon';

// Site header. Routes match router.jsx exactly: '/', '/report', '/issues/:id', '/login',
// '/register'; '/dashboard' is a top-level route with its own shell.
//
// The nav shows only what the visitor can actually do:
//   signed out  — Log in, Sign up. No "Feed" link, because '/' IS the feed and the wordmark
//                 already goes there; no "Report an issue", because POST /api/issues is
//                 auth(true) and the form would bounce them to the login page anyway.
//   citizen     — Report an issue, and who they are signed in as.
//   officer/admin — Dashboard, and who they are signed in as.
//
// No JS dropdown menu behind the avatar. On narrow screens the row wraps onto a second line
// instead of collapsing behind a hamburger — fewer moving parts, nothing to trap focus in, and
// it cannot scroll sideways.

const link = ({ isActive }) =>
  'min-h-11 inline-flex items-center border-b-2 px-1 text-sm transition-colors duration-200 ' +
  (isActive
    ? 'border-brand-600 font-medium text-brand-600'
    : 'border-transparent text-ink hover:text-brand-600');

const cta = 'inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm' +
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
    <header className="border-b border-line bg-surface">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3"
      >
        <Link to="/" className="mr-auto min-h-11 inline-flex items-center text-xl font-bold">
          <span className="text-brand-600">Lok</span>Samadhan
        </Link>

        {/* While the token is being validated, render nothing here rather than flashing "Log in"
            at a user who is already signed in. The space is held by the row itself. */}
        {loading ? null : user ? (
          <>
            {isStaff ? (
              <NavLink to="/dashboard" className={cta}>
                <Icon name="dashboard" />
                Dashboard
              </NavLink>
            ) : (
              <Link to="/report" className={cta}>
                <Icon name="plus" />
                Report an Issue
              </Link>
            )}

            <Link to="/profile" className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-canvas" title="My Profile">
              <Avatar name={user.name} />
              <span className="hidden text-sm sm:block">
                <span className="block font-medium leading-tight">{user.name}</span>
                <span className="block text-xs capitalize text-ink-muted">{user.role}</span>
              </span>
            </Link>

            <button type="button" onClick={handleLogout} title="Log out" aria-label="Log out"
              className="cursor-pointer rounded-lg p-2 text-ink-muted transition-colors
                duration-200 hover:bg-canvas hover:text-ink">
              <Icon name="logout" />
            </button>
          </>
        ) : (
          <>
            <Link to="/login" state={{ from: '/report' }} className={cta}>
              <Icon name="plus" />
              Report an Issue
            </Link>
            <NavLink to="/login" className={link}>Log in</NavLink>
            <Link to="/register" className={outline}>Sign up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

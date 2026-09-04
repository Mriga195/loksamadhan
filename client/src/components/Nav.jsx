import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Site header. Routes match router.jsx exactly: '/', '/report', '/issues/:id', '/login',
// '/register', '/dashboard'.
//
// No JS dropdown menu. On narrow screens the row wraps onto a second line instead of collapsing
// behind a hamburger — fewer moving parts, nothing to trap focus in, and it cannot scroll
// sideways. With six links at most, a menu would be more code for a worse result.

// Underline sits on the link itself (border-b) rather than a sliding indicator: no measuring,
// no resize listener, and it survives wrapping.
const link = ({ isActive }) =>
  'min-h-11 inline-flex items-center border-b-2 px-1 text-sm transition-colors duration-200 ' +
  (isActive
    ? 'border-brand-600 font-medium text-brand-600'
    : 'border-transparent text-ink hover:text-brand-600');

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const isStaff = user?.role === 'officer' || user?.role === 'admin';

  return (
    <header className="border-b border-line bg-surface">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-6 py-3"
      >
        <Link to="/" className="mr-auto min-h-11 inline-flex items-center text-xl font-bold">
          <span className="text-brand-600">Lok</span>Samadhan
        </Link>

        <NavLink to="/" end className={link}>Feed</NavLink>
        <NavLink to="/report" className={link}>Report Issue</NavLink>

        {/* While the token is being validated, render nothing here rather than flashing
            "Officer Login" at a user who is already signed in. */}
        {loading ? null : user ? (
          <>
            {isStaff && <NavLink to="/dashboard" className={link}>Dashboard</NavLink>}
            <span className="text-sm text-ink-muted">{user.name}</span>
            <button type="button" onClick={logout}
              className="min-h-11 cursor-pointer text-sm text-ink hover:text-brand-600">
              Log out
            </button>
          </>
        ) : (
          <NavLink to="/login" className={link}>Officer Login</NavLink>
        )}

        <Link to="/report"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-5
            text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-700">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.75" className="size-5">
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" d="M12 8.5v7M8.5 12h7" />
          </svg>
          Report an Issue
        </Link>
      </nav>
    </header>
  );
}

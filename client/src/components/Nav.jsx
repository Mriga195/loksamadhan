import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Site header. Routes match router.jsx exactly: '/', '/report', '/issues/:id', '/login',
// '/register', '/dashboard'.
//
// No JS dropdown menu. On narrow screens the row wraps onto a second line instead of collapsing
// behind a hamburger — fewer moving parts, nothing to trap focus in, and it cannot scroll
// sideways. With six links at most, a menu would be more code for a worse result.

const link = 'min-h-11 inline-flex items-center px-3 text-sm rounded-lg transition-colors' +
  ' duration-200 hover:bg-canvas';

export default function Nav() {
  const { user, loading, logout } = useAuth();
  const isStaff = user?.role === 'officer' || user?.role === 'admin';

  return (
    <header className="border-b border-line bg-surface">
      <nav
        aria-label="Main"
        className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-1 gap-y-2 px-4 py-2"
      >
        <Link to="/" className="mr-auto min-h-11 inline-flex items-center gap-2 px-1 font-semibold">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.75" className="size-6 text-brand-600">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 21s7.5-5.6 7.5-11.25a7.5 7.5 0 1 0-15 0C4.5 15.4 12 21 12 21Z" />
            <circle cx="12" cy="9.75" r="2.25" />
          </svg>
          LokSamadhan
        </Link>

        <NavLink to="/report" className={link}>Report an issue</NavLink>

        {/* While the token is being validated, render nothing here rather than flashing "Log in"
            at a user who is already signed in. The space is held by the row itself. */}
        {loading ? null : user ? (
          <>
            {isStaff && <NavLink to="/dashboard" className={link}>Dashboard</NavLink>}
            <span className="px-3 text-sm text-ink-muted">{user.name}</span>
            <button type="button" onClick={logout} className={`${link} cursor-pointer`}>
              Log out
            </button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={link}>Log in</NavLink>
            <NavLink
              to="/register"
              className={`${link} bg-brand-600 font-medium text-white hover:bg-brand-700`}
            >
              Sign up
            </NavLink>
          </>
        )}
      </nav>
    </header>
  );
}

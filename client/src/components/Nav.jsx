import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import Avatar from './Avatar';
import Icon from './Icon';
import LangToggle from './LangToggle';
import Logo from './Logo';

// Site header. Routes match router.jsx exactly.

const item = ({ isActive }) =>
  'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200 ' +
  (isActive ? 'bg-brand-50 font-medium text-brand-600' : 'text-ink hover:bg-canvas');

const cta = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-600' +
  ' px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-700';

const outline = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border' +
  ' border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-200' +
  ' hover:bg-canvas hover:border-slate-300';

// English originals — used as initial state and as fallback keys.
const EN = {
  feed: 'Feed',
  departments: 'Departments',
  dashboard: 'Dashboard',
  report: 'Report an Issue',
  login: 'Log in',
  signup: 'Sign up',
  logout: 'Log out',
};

export default function Nav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, loading, logout } = useAuth();
  const { lang, translate } = useLang();
  const isStaff = user?.role === 'officer' || user?.role === 'admin';

  const [open, setOpen] = useState(false);
  const [t, setT] = useState(EN);

  // Translate nav strings whenever the language changes.
  useEffect(() => {
    if (lang === 'en') { setT(EN); return; }
    translate(Object.values(EN)).then((vals) => {
      setT(Object.fromEntries(Object.keys(EN).map((k, i) => [k, vals[i]])));
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const links = (
    <>
      <NavLink to="/feed" className={item}>
        <Icon name="home" className="size-[18px]" />
        {t.feed}
      </NavLink>

      <NavLink to="/departments" className={item}>
        <Icon name="building" className="size-[18px]" />
        {t.departments}
      </NavLink>

      {isStaff && !loading && (
        <NavLink to="/dashboard" className={item}>
          <Icon name="dashboard" className="size-[18px]" />
          {t.dashboard}
        </NavLink>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 px-4 pt-4">
      <nav
        aria-label="Main"
        className="mx-auto max-w-7xl rounded-2xl border border-line bg-surface px-3 py-2
          shadow-[0_2px_12px_rgba(15,23,42,0.06)] md:px-4 md:py-2.5"
      >
        <div className="flex items-center gap-2 md:grid md:grid-cols-[1fr_auto_1fr]">
          <Link to="/" aria-label="LokSamadhan — home"
            className="inline-flex min-h-11 items-center md:mr-2">
            <Logo className="size-9 md:size-10" />
          </Link>

          <div className="hidden items-center gap-2 md:flex md:justify-self-center">{links}</div>

          <div className="ml-auto hidden items-center gap-2 md:flex md:justify-self-end">
            {loading ? null : user ? (
              <>
                {!isStaff && (
                  <Link to="/report" className={cta}>
                    <Icon name="plus" className="size-[18px]" />
                    {t.report}
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

                <button type="button" onClick={handleLogout} title={t.logout} aria-label={t.logout}
                  className="cursor-pointer rounded-full p-2 text-ink-muted transition-colors
                    duration-200 hover:bg-canvas hover:text-ink">
                  <Icon name="logout" className="size-[18px]" />
                </button>
              </>
            ) : (
              <>
                <Link to="/report" className={cta}>
                  <Icon name="plus" className="size-[18px]" />
                  {t.report}
                </Link>
                <NavLink to="/login" className={item}>{t.login}</NavLink>
                <Link to="/register" className={outline}>{t.signup}</Link>
              </>
            )}

            <LangToggle />
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
                      {t.report}
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
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  <Link to="/report" className={cta}>
                    <Icon name="plus" className="size-[18px]" />
                    {t.report}
                  </Link>
                  <Link to="/register" className={outline}>{t.signup}</Link>
                  <NavLink to="/login" className={item}>{t.login}</NavLink>
                </>
              )}

              <div className="pt-1">
                <LangToggle />
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

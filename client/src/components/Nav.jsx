import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import Avatar from './Avatar';
import Icon from './Icon';
import FindIssue from './FindIssue';
import LangToggle from './LangToggle';
import NotificationBell from './NotificationBell';
import Logo from './Logo';

// Site header. Routes match router.jsx exactly.
//
// Two shells over one set of links:
//   md+     a floating pill bar. The account controls live behind the avatar rather than beside
//           it — avatar + name + role + a bare logout icon was four targets for two actions, and
//           the logout icon in particular was one mis-click from ending a session.
//   below md a slide-in sheet. The old accordion expanded inside the pill bar, which on a phone
//           grew the "bar" to most of the viewport and pushed the page out from under the reader.
//
// The sheet stays mounted so it can transition; `inert` is what keeps it out of the tab order
// while closed, so there is no focus trap to maintain.

const item = ({ isActive }) =>
  'flex min-h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200 ' +
  (isActive ? 'bg-brand-50 font-medium text-brand-600' : 'text-ink hover:bg-canvas');

// Sheet rows are wider and flatter than the desktop pills, and mark the active route with a bar
// on the leading edge — a filled pill at full row width reads as a pressed button, not a location.
const sheetItem = ({ isActive }) =>
  'flex min-h-12 items-center gap-3 rounded-lg border-l-2 px-3 text-sm transition-colors duration-200 ' +
  (isActive
    ? 'border-brand-600 bg-brand-50 font-medium text-brand-600'
    : 'border-transparent text-ink hover:bg-canvas');

const cta = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brand-600' +
  ' px-5 text-sm font-medium text-white transition-colors duration-200 hover:bg-brand-700';

const outline = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border' +
  ' border-line bg-surface px-4 text-sm font-medium text-ink transition-colors duration-200' +
  ' hover:bg-canvas hover:border-slate-300';

const menuRow = 'flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-3 text-left text-sm' +
  ' text-ink transition-colors duration-200 hover:bg-canvas';

// English originals — used as initial state and as fallback keys.
const EN = {
  feed: 'Feed',
  departments: 'Departments',
  dashboard: 'Dashboard',
  report: 'Report an Issue',
  findById: 'Check status',   // the reader has a reference and wants to know where it got to
  reportShort: 'Report',      // the phone bar — the long form does not fit beside the wordmark
  login: 'Log in',
  signup: 'Sign up',
  logout: 'Log out',
  profile: 'My profile',
  account: 'Account',
};

export default function Nav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, loading, logout } = useAuth();
  const { lang, translate } = useLang();
  const isStaff = user?.role === 'officer' || user?.role === 'admin';

  const [open, setOpen] = useState(false);        // mobile sheet
  const [menuOpen, setMenuOpen] = useState(false); // desktop account dropdown
  const [scrolled, setScrolled] = useState(false);
  const [t, setT] = useState(EN);
  const menuRef = useRef(null);

  // Translate nav strings whenever the language changes.
  useEffect(() => {
    if (lang === 'en') { setT(EN); return; }
    translate(Object.values(EN)).then((vals) => {
      setT(Object.fromEntries(Object.keys(EN).map((k, i) => [k, vals[i]])));
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setOpen(false); setMenuOpen(false); }, [pathname]);

  // Escape closes whichever surface is open; the dropdown first, since it sits on top.
  useEffect(() => {
    if (!open && !menuOpen) return;
    const onKey = e => { if (e.key !== 'Escape') return;
      // A native <dialog> handles its own Escape. Without this, one press would close the
      // dialog and the sheet under it at the same time.
      if (document.querySelector('dialog[open]')) return;
      if (menuOpen) setMenuOpen(false); else setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, menuOpen]);

  // Click-away for the dropdown. pointerdown, not click: a click that lands on a link elsewhere
  // should close the menu before that link navigates, not after.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = e => { if (!menuRef.current?.contains(e.target)) setMenuOpen(false); };
    window.addEventListener('pointerdown', onDown);
    return () => window.removeEventListener('pointerdown', onDown);
  }, [menuOpen]);

  // The page behind an open sheet must not scroll with it.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // The bar is flat while the page is at the top and lifts once content runs under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = () => {
    setOpen(false);
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  const routes = [
    { to: '/feed', icon: 'home', label: t.feed },
    { to: '/departments', icon: 'building', label: t.departments },
    ...(isStaff && !loading ? [{ to: '/dashboard', icon: 'dashboard', label: t.dashboard }] : []),
  ];

  const links = (className) => routes.map(r => (
    <NavLink key={r.to} to={r.to} className={className}>
      <Icon name={r.icon} className="size-[18px]" />
      {r.label}
    </NavLink>
  ));

  const reportCta = (extra = '') => (
    <Link to="/report" className={`${cta} ${extra}`}>
      <Icon name="plus" className="size-[18px]" />
      {t.report}
    </Link>
  );

  const identity = (
    <>
      <Avatar name={user?.name} src={user?.avatar} />
      <span className="min-w-0 text-sm">
        <span className="block truncate font-medium leading-tight">{user?.name}</span>
        <span className="block text-xs capitalize text-ink-muted">{user?.role}</span>
      </span>
    </>
  );

  return (
    <>
      <header className="sticky top-0 z-30 px-4 pt-4">
        <nav
          aria-label="Main"
          className={`mx-auto max-w-7xl rounded-2xl border px-3 py-2 transition-[box-shadow,border-color,background-color]
            duration-300 md:px-4 md:py-2.5 ${scrolled
              ? 'border-transparent bg-surface/85 shadow-[0_8px_28px_rgba(15,23,42,0.12)] backdrop-blur-xl'
              : 'border-line bg-surface shadow-[0_2px_12px_rgba(15,23,42,0.06)]'}`}
        >
          <div className="flex items-center gap-2">
            <Link to="/" aria-label="LokSamadhan — home"
              className="inline-flex min-h-11 items-center gap-2 md:mr-2">
              <Logo className="size-9 md:size-10" />
              <span className="text-base font-semibold tracking-tight max-[400px]:hidden md:hidden lg:inline">
                LokSamadhan
              </span>
            </Link>

            {/* Two groups, not three: logo left, everything else right. */}
            <div className="ml-auto hidden items-center gap-1 md:flex">
              {links(item)}
              <FindIssue triggerClass={`${item({ isActive: false })} cursor-pointer`} label={t.findById} />
            </div>

            <div className="hidden items-center gap-2 md:ml-6 md:flex">
              {/* Auth resolves a beat after paint. Hold the space rather than letting the bar
                  reflow under the reader's cursor. */}
              {loading ? (
                <span aria-hidden="true" className="h-11 w-44 animate-pulse rounded-full bg-canvas" />
              ) : user ? (
                <>
                  <NotificationBell />
                  {!isStaff && reportCta()}

                  <div ref={menuRef} className="relative ml-1">
                    <button
                      type="button"
                      onClick={() => setMenuOpen(!menuOpen)}
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      aria-label={t.account}
                      className={`flex max-w-[13rem] cursor-pointer items-center gap-2 rounded-full p-1
                        pr-2.5 transition-colors duration-200 ${menuOpen ? 'bg-canvas' : 'hover:bg-canvas'}`}
                    >
                      {identity}
                      <Icon name="down" className={`size-4 shrink-0 text-ink-muted transition-transform
                        duration-200 ${menuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {menuOpen && (
                      <div role="menu"
                        className="absolute right-0 top-[calc(100%+0.5rem)] w-56 overflow-hidden rounded-xl
                          border border-line bg-surface py-1 shadow-[0_12px_32px_rgba(15,23,42,0.14)]">
                        <Link to="/profile" role="menuitem" className={menuRow}>
                          <Icon name="users" className="size-[18px] text-ink-muted" />
                          {t.profile}
                        </Link>
                        <button type="button" role="menuitem" onClick={handleLogout}
                          className={`${menuRow} mt-1 border-t border-line text-rejected-600 hover:bg-rejected-50`}>
                          <Icon name="logout" className="size-[18px]" />
                          {t.logout}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {reportCta()}
                  <NavLink to="/login" className={item}>{t.login}</NavLink>
                  <Link to="/register" className={outline}>{t.signup}</Link>
                </>
              )}

              <LangToggle />
            </div>

            {/* Phone: the CTA stays on the bar — filing a report is the one thing worth a tap
                without opening a menu first. Staff have no CTA, so they get the avatar instead. */}
            <div className="ml-auto flex items-center gap-2 md:hidden">
              {/* Icon only. A bare plus, not the shared `plus` icon — that one draws its own
                  circle, and the button is already the circle. */}
              {!loading && !isStaff && (
                <Link to="/report" aria-label={t.report} title={t.report}
                  className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-full
                    px-2 text-[13px] font-medium text-brand-700 transition-colors duration-200
                    hover:bg-brand-50">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" className="size-4 shrink-0">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  {/* Short label, nowrap: the full "Report an Issue" wrapped to two lines and
                      stretched the bar. Drops out entirely on the narrowest phones. */}
                  <span className="max-[360px]:hidden">{t.reportShort}</span>
                </Link>
              )}
              <NotificationBell />
              <button
                type="button"
                onClick={() => setOpen(true)}
                aria-expanded={open}
                aria-controls="nav-sheet"
                aria-label="Open menu"
                className={`grid size-11 cursor-pointer place-items-center rounded-full
                  text-ink-muted transition-colors duration-200 hover:bg-canvas hover:text-ink
                  ${user ? '' : 'border border-line'}`}
              >
                {user ? <Avatar name={user.name} src={user.avatar} className="size-8 text-xs" />
                      : <Icon name="menu" className="size-5" />}
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile sheet. Always mounted so it can slide; `inert` keeps it unfocusable when closed. */}
      <div id="nav-sheet" inert={!open || undefined} className="fixed inset-0 z-40 overflow-hidden md:hidden">
        <button
          type="button" tabIndex={-1} aria-label="Close menu"
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-300
            ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        />

        <div
          className={`absolute right-0 top-0 flex h-full w-[min(20rem,86vw)] flex-col bg-surface
            shadow-[-8px_0_32px_rgba(15,23,42,0.18)] transition-transform duration-300 ease-out
            motion-reduce:transition-none ${open ? 'translate-x-0' : 'translate-x-full'}`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <Link to="/" className="inline-flex items-center gap-2">
              <Logo className="size-8" />
              <span className="font-semibold tracking-tight">LokSamadhan</span>
            </Link>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu"
              className="grid size-10 cursor-pointer place-items-center rounded-full text-ink-muted
                transition-colors hover:bg-canvas hover:text-ink">
              <Icon name="close" className="size-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {!loading && user && (
              <Link to="/profile"
                className="mb-3 flex items-center gap-3 rounded-xl bg-canvas p-3 transition-colors hover:bg-brand-50">
                {identity}
                <Icon name="right" className="ml-auto size-4 shrink-0 text-ink-muted" />
              </Link>
            )}

            <div className="flex flex-col gap-1">
              {links(sheetItem)}
              <FindIssue
                triggerClass={`${sheetItem({ isActive: false })} w-full cursor-pointer`}
                label={t.findById}
              />
            </div>

            <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
              {loading ? (
                <span aria-hidden="true" className="h-11 animate-pulse rounded-full bg-canvas" />
              ) : user ? (
                <>
                  {!isStaff && reportCta('w-full')}
                  <button type="button" onClick={handleLogout}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 text-sm
                      font-medium text-rejected-600 transition-colors hover:bg-rejected-50">
                    <Icon name="logout" className="size-[18px]" />
                    {t.logout}
                  </button>
                </>
              ) : (
                <>
                  {reportCta('w-full')}
                  <Link to="/register" className={`${outline} w-full`}>{t.signup}</Link>
                  <NavLink to="/login" className={({ isActive }) => `${outline} w-full ${isActive ? 'border-brand-600 text-brand-600' : ''}`}>
                    {t.login}
                  </NavLink>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-line p-3">
            <LangToggle />
          </div>
        </div>
      </div>
    </>
  );
}

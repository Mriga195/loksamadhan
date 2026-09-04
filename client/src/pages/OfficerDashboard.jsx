import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import IssueDrawer, { shortId } from '../components/IssueDrawer';
import StatsCards from '../components/StatsCards';
import StatusModal from '../components/StatusModal';
import StatusPill from '../components/StatusPill';
import { Skeleton } from '../components/Spinner';

// Officer and admin share this page. Admin is a `role === 'admin'` branch, not a second file —
// the two views differ by one filter and one heading, and a second page would be two places to
// fix every bug.
//
// This route renders its own shell (sidebar + top bar) instead of the public site nav, so it is
// mounted OUTSIDE <App /> in router.jsx. Two headers stacked is the bug that change prevents.

const DEPARTMENTS = [
  'Roads & Infrastructure', 'Water Supply & Sewage', 'Solid Waste Management',
  'Electricity & Lighting', 'Public Health & Drainage', 'General Administration',
];

// "Overdue" is not a field the API sends — it is this dashboard's own definition, in one place
// so the tab, the count and the row tag can never disagree.
// ponytail: one flat threshold for every category. Per-department SLAs if the brief ever gets one.
const OVERDUE_DAYS = 7;
const isOverdue = issue =>
  issue.status !== 'Resolved' && Date.now() - new Date(issue.createdAt) > OVERDUE_DAYS * 86400000;

const PER_PAGE = 10;

const PRIORITY_TEXT = {
  high: 'text-priority-high font-semibold',
  medium: 'text-priority-medium',
  low: 'text-priority-low',
};
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const age = iso => {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  const hours = Math.floor((Date.now() - new Date(iso)) / 3600000);
  return hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'} ago` : 'just now';
};

// Only destinations that exist. The mockup's Analytics/Reports/Users/Settings items are not
// here because they would be dead links, and a nav that lies is worse than a short one.
const NAV = [
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard', end: true },
  { to: '/', icon: 'clipboard', label: 'Public feed' },
  { to: '/report', icon: 'plus', label: 'Report an issue' },
];

const navClass = ({ isActive }) =>
  `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-200 ${
    isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-ink hover:bg-canvas'}`;

export default function OfficerDashboard() {
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const department = user?.department;

  // Protect officer/admin dashboard route
  useEffect(() => {
    if (!authLoading && (!user || (user.role !== 'officer' && user.role !== 'admin'))) {
      navigate('/login', { state: { from: '/dashboard' }, replace: true });
    }
  }, [authLoading, user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('all');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    if (!user || (user.role !== 'officer' && user.role !== 'admin')) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100', duplicates: 'include' });
      // Officers see their own department. Admins see everything.
      if (!isAdmin && department) params.set('department', department);
      const data = await apiFetch(`/api/issues?${params}`);
      setIssues(data.items);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, department, user]);

  useEffect(() => { load(); }, [load]);

  // Unassigned issues have no department, so tab filtering happens here rather than server-side
  // — `?department=` would exclude exactly the rows the queue is for.
  const TABS = useMemo(() => ({
    all: () => true,
    mine: i => i.department === department,
    unassigned: i => !i.department,
    overdue: isOverdue,
  }), [department]);

  const rows = useMemo(() => {
    const filtered = issues
      .filter(TABS[tab])
      .filter(i => !deptFilter || i.department === deptFilter);
    // The officer's actual job is triage, so the order is priority then age.
    return [...filtered].sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
      || new Date(a.createdAt) - new Date(b.createdAt));
  }, [issues, tab, deptFilter, TABS]);

  // ponytail: paging in the browser over the fetched page. The server caps a request at 100,
  // so wire `?page=` through when a queue outgrows that.
  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  useEffect(() => { setPage(1); }, [tab, deptFilter]);

  // One updated issue back from a PATCH replaces its row; no refetch of the whole table.
  const replace = updated =>
    setIssues(list => list.map(i => (i._id === updated._id ? { ...i, ...updated } : i)));

  const selected = issues.find(i => i._id === selectedId) || null;

  // Exports what is on screen, filters and all — the officer's mental model of "this list".
  const exportCsv = () => {
    const head = ['ID', 'Title', 'Category', 'Department', 'Status', 'Priority', 'Reported'];
    const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [head, ...rows.map(i => [
      shortId(i), i.title, i.category, i.department || 'Unassigned', i.status,
      i.priority || '', new Date(i.createdAt).toISOString(),
    ])].map(r => r.map(cell).join(',')).join('\n');

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `loksamadhan-${tab}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const counts = {
    all: issues.length,
    mine: issues.filter(TABS.mine).length,
    unassigned: issues.filter(TABS.unassigned).length,
    overdue: issues.filter(isOverdue).length,
  };

  const tabs = [
    ['all', 'All issues'],
    ...(department ? [['mine', 'My department']] : []),
    ['unassigned', 'Unassigned'],
    ['overdue', 'Overdue'],
  ];

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <Skeleton count={2} className="h-28 w-96" />
      </div>
    );
  }

  if (!user || (user.role !== 'officer' && user.role !== 'admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-canvas">
      {/* Top bar spans the full width, above the sidebar, as one continuous surface. */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-line
        bg-surface px-4 sm:px-6">
        <Link to="/" className="text-xl font-bold">
          <span className="text-brand-600">Lok</span>Samadhan
        </Link>

        {/* The mockup's org switcher, showing the one real scope this build has: the officer's
            department. Not a dropdown — there is nothing else to switch to. */}
        <span className="hidden items-center gap-2 border-l border-line pl-4 text-sm
          text-ink-muted sm:flex">
          <Icon name="building" className="size-5" />
          {isAdmin ? 'All departments' : department || 'No department set'}
        </span>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">{user?.name}</p>
            <p className="text-xs capitalize text-ink-muted">{user?.role}</p>
          </div>
          <Avatar name={user?.name} />
          <button type="button" onClick={handleLogout} title="Log out" aria-label="Log out"
            className="cursor-pointer rounded-lg p-2 text-ink-muted transition-colors
              hover:bg-canvas hover:text-ink">
            <Icon name="logout" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Below lg the sidebar is dropped rather than collapsed behind a hamburger: its three
            links also exist in the public nav, so nothing becomes unreachable. */}
        <aside aria-label="Dashboard" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60
          shrink-0 border-r border-line bg-surface p-3 lg:flex lg:flex-col">
          <nav className="space-y-1">
            {NAV.map(({ to, icon, label, end }) => (
              <NavLink key={to} to={to} end={end} className={navClass}>
                <Icon name={icon} />
                {label}
              </NavLink>
            ))}
          </nav>

          <button type="button" onClick={load}
            className="mt-auto flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3
              text-sm text-ink-muted transition-colors hover:bg-canvas hover:text-ink">
            <Icon name="refresh" />
            Refresh data
          </button>
        </aside>

        <main className={`min-w-0 flex-1 p-4 sm:p-6 ${selected ? 'xl:mr-[28rem]' : ''}`}>
          <div className="mb-6">
            <h1 className="text-2xl font-semibold">
              {isAdmin ? 'Admin dashboard' : 'Officer dashboard'}
            </h1>
            <p className="mt-0.5 text-sm text-ink-muted">
              Overview of issues and performance
              {!isAdmin && department ? ` — ${department}` : ''}
            </p>
          </div>

          {error && (
            <p className="mb-6 rounded-card border border-rejected-600/30 bg-rejected-50 p-4
              text-sm text-rejected-600">
              Could not load issues: {error}
            </p>
          )}

          {loading ? (
            <Skeleton count={2} className="h-32" />
          ) : (
            <>
              <StatsCards issues={issues} />

              <section className="mt-6 rounded-card border border-line bg-surface">
                <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 pt-2">
                  <div role="tablist" aria-label="Issue queues" className="flex flex-wrap">
                    {tabs.map(([key, label]) => (
                      <button key={key} type="button" role="tab" aria-selected={tab === key}
                        onClick={() => setTab(key)}
                        className={`-mb-px cursor-pointer border-b-2 px-3 pb-3 pt-2 text-sm
                          transition-colors ${tab === key
                            ? 'border-brand-600 font-medium text-brand-600'
                            : 'border-transparent text-ink-muted hover:text-ink'}`}>
                        {label}
                        {key === 'overdue' && counts.overdue > 0 && (
                          <span className="ml-1.5 rounded-full bg-rejected-50 px-1.5 py-0.5
                            text-xs font-medium text-rejected-600">
                            {counts.overdue}
                          </span>
                        )}
                        {key !== 'overdue' && (
                          <span className="ml-1.5 text-xs text-ink-muted">{counts[key]}</span>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="ml-auto flex items-center gap-2 pb-2">
                    {isAdmin && (
                      <select aria-label="Department" value={deptFilter}
                        onChange={e => setDeptFilter(e.target.value)}
                        className="min-h-9 cursor-pointer rounded-lg border border-line
                          bg-surface px-3 text-sm">
                        <option value="">All departments</option>
                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={exportCsv} disabled={rows.length === 0}
                      title="Export this list as CSV"
                      className="inline-flex min-h-9 cursor-pointer items-center gap-1.5
                        rounded-lg border border-line px-3 text-sm transition-colors
                        hover:bg-canvas disabled:opacity-50">
                      <Icon name="download" className="size-4" />
                      Export
                    </button>
                  </div>
                </div>

                {rows.length === 0 ? (
                  <p className="p-8 text-center text-sm text-ink-muted">
                    {tab === 'overdue' ? `Nothing has been open longer than ${OVERDUE_DAYS} days.`
                      : tab === 'unassigned' ? 'Everything has a department. Good.'
                      : 'No issues here yet.'}
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b border-line bg-canvas/50 text-xs
                          uppercase tracking-wide text-ink-muted">
                          <tr>
                            <th scope="col" className="px-4 py-3 font-medium">ID</th>
                            <th scope="col" className="px-4 py-3 font-medium">Title</th>
                            <th scope="col" className="px-4 py-3 font-medium">Department</th>
                            <th scope="col" className="px-4 py-3 font-medium">Status</th>
                            <th scope="col" className="px-4 py-3 font-medium">Priority</th>
                            <th scope="col" className="px-4 py-3 font-medium">Age</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map(issue => (
                            <tr key={issue._id}
                              onClick={() => setSelectedId(issue._id)}
                              className={`cursor-pointer border-b border-line last:border-0
                                transition-colors hover:bg-canvas ${
                                  selectedId === issue._id ? 'bg-brand-50/60' : ''}`}>
                              <td className="whitespace-nowrap px-4 py-3">
                                {/* The keyboard path into the drawer; the row click is a
                                    convenience on top of it. */}
                                <button type="button"
                                  onClick={e => { e.stopPropagation(); setSelectedId(issue._id); }}
                                  className="cursor-pointer font-medium text-brand-600
                                    hover:underline">
                                  #{shortId(issue)}
                                </button>
                              </td>
                              <td className="max-w-xs px-4 py-3">
                                <span className="block truncate font-medium">{issue.title}</span>
                                {issue.duplicateOf && (
                                  <span className="text-xs text-ink-muted">
                                    duplicate — tracked under the original
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-ink-muted">
                                {issue.department || (
                                  <span className="italic">Unassigned</span>
                                )}
                              </td>
                              <td className="px-4 py-3"><StatusPill status={issue.status} /></td>
                              <td className={`px-4 py-3 capitalize ${
                                PRIORITY_TEXT[issue.priority] || 'text-ink-muted'}`}>
                                {issue.priority || '—'}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                                {age(issue.createdAt)}
                                {isOverdue(issue) && (
                                  <span className="ml-2 rounded bg-rejected-50 px-1.5 py-0.5
                                    text-xs font-medium text-rejected-600">
                                    Overdue
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t
                      border-line px-4 py-3 text-sm text-ink-muted">
                      <span>
                        Showing {(current - 1) * PER_PAGE + 1}&ndash;
                        {Math.min(current * PER_PAGE, rows.length)} of {rows.length} issues
                      </span>
                      {pageCount > 1 && (
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setPage(current - 1)}
                            disabled={current === 1} aria-label="Previous page"
                            className="cursor-pointer rounded-lg border border-line p-2
                              transition-colors hover:bg-canvas disabled:opacity-40">
                            <Icon name="left" className="size-4" />
                          </button>
                          <span className="px-2 tabular-nums">
                            Page {current} of {pageCount}
                          </span>
                          <button type="button" onClick={() => setPage(current + 1)}
                            disabled={current === pageCount} aria-label="Next page"
                            className="cursor-pointer rounded-lg border border-line p-2
                              transition-colors hover:bg-canvas disabled:opacity-40">
                            <Icon name="right" className="size-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {selected && (
        <IssueDrawer issue={selected} onClose={() => setSelectedId(null)} onSaved={replace}
          onUpdateStatus={setEditing} />
      )}

      {editing && (
        <StatusModal issue={editing} onClose={() => setEditing(null)} onSaved={replace} />
      )}
    </div>
  );
}

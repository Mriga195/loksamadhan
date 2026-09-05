import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import IssueDrawer, { shortId } from '../components/IssueDrawer';
import StatsCards from '../components/StatsCards';
import StatusModal from '../components/StatusModal';
import StatusPill from '../components/StatusPill';
import OfficeUsersManager from '../components/OfficeUsersManager';
import AnalyticsView from '../components/AnalyticsView';
import ConfirmDialog from '../components/ConfirmDialog';
import NotificationBell from '../components/NotificationBell';
import { Skeleton } from '../components/Spinner';
import { useSeo } from '../seo';

const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Sewage',
  'Solid Waste Management',
  'Electricity & Lighting',
  'Public Health & Drainage',
  'General Administration',
];

// "Late" is decided once, on the server, from the per-category targets in lib/sla.js and
// shipped on every issue. An issue that is already resolved, closed, or submitted for verification
// is not an active SLA breach in the triage queue.
const isOverdue = issue =>
  issue.sla?.state === 'overdue' &&
  issue.status !== 'Resolved' &&
  issue.status !== 'Closed' &&
  issue.status !== 'Rejected' &&
  issue.status !== 'Pending Verification';


const PER_PAGE = 10;

const PRIORITY_BADGES = {
  high: 'bg-red-50 text-red-700 border-red-200 font-semibold',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 font-medium',
  low: 'bg-slate-100 text-slate-700 border-slate-200 font-normal',
};

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const age = iso => {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days > 0) return `${days} day${days === 1 ? '' : 's'} ago`;
  const hours = Math.floor((Date.now() - new Date(iso)) / 3600000);
  return hours > 0 ? `${hours} hour${hours === 1 ? '' : 's'} ago` : 'just now';
};

export default function OfficerDashboard() {
  useSeo('Officer dashboard');

  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const department = user?.department;

  const isLoggingOut = useRef(false);

  // Protect officer/admin dashboard route
  useEffect(() => {
    if (isLoggingOut.current) return;
    if (!authLoading) {
      if (!user) {
        navigate('/login', { state: { from: '/dashboard' }, replace: true });
      } else if (user.role !== 'officer' && user.role !== 'admin') {
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, user, navigate]);

  const handleLogout = () => {
    isLoggingOut.current = true;
    logout();
    navigate('/login', { replace: true });
  };

  // Main navigation view state: 'issues' | 'users' | 'analytics'
  const [viewMode, setViewMode] = useState('issues');
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Queue state
  const [tab, setTab] = useState('my_allotted'); // will be corrected by sync effect
  const [deptFilter, setDeptFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('priority_desc'); // 'priority_desc' | 'priority_asc' | 'time_desc' | 'time_asc'
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [expandedLimits, setExpandedLimits] = useState({});

  const toggleExpand = (id, e) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Group duplicates by root issue id
  const duplicatesByParent = useMemo(() => {
    const map = {};
    for (const item of issues) {
      if (item.duplicateOf) {
        const pId = String(item.duplicateOf);
        if (!map[pId]) map[pId] = [];
        map[pId].push(item);
      }
    }
    return map;
  }, [issues]);

  // Sync tab default once auth state / role loads
  useEffect(() => {
    if (!user) return;
    if (!isAdmin && (tab === 'all' || tab === 'unassigned' || tab === 'pending_verification' && false)) {
      setTab('my_allotted');
    } else if (isAdmin && (tab === 'my_allotted' || tab === 'issues')) {
      setTab('unassigned'); // admin sees unassigned first — that's the primary triage job
    }
  }, [isAdmin, user]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async (isManualRefresh = false) => {
    if (!user || (user.role !== 'officer' && user.role !== 'admin')) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100', duplicates: 'include' });
      const data = await apiFetch(`/api/issues?${params}`);
      setIssues(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Filter predicates
  const TABS = useMemo(() => ({
    all: () => true,
    unassigned: i => (!i.department || !i.assignedOfficer || (!i.assignedOfficer._id && !i.assignedOfficer.name)) && i.status !== 'Closed' && i.status !== 'Resolved' && i.status !== 'Rejected',
    pending_verification: i => i.status === 'Pending Verification',
    unsatisfied: i => i.status === 'Unsatisfied',
    my_allotted: i => i.assignedOfficer && String(i.assignedOfficer?._id || i.assignedOfficer) === String(user?._id),
    issues: i => i.department === department,
    submitted: i => (isAdmin ? true : i.department === department) && (i.status === 'Submitted' || i.status === 'Acknowledged'),
    in_progress: i => (isAdmin ? true : i.department === department) && i.status === 'In Progress',
    resolved: i => (isAdmin ? true : i.department === department) && i.status === 'Resolved',
    closed: i => (isAdmin ? true : i.department === department) && i.status === 'Closed',
    rejected: i => (isAdmin ? true : i.department === department) && i.status === 'Rejected',
    overdue: i => (isAdmin ? true : i.department === department) && isOverdue(i),
  }), [department, isAdmin, user?._id]);

  // Computed issues table rows (only root issues, duplicates are grouped under their root issue)
  const rows = useMemo(() => {
    const filterFn = TABS[tab] || (() => true);
    const query = searchQuery.trim().toLowerCase();

    // Dashboard queue displays root issues; duplicates are grouped under their root issue
    const rootIssues = issues.filter(i => !i.duplicateOf);

    const filtered = rootIssues
      .filter(filterFn)
      .filter(i => !deptFilter || i.department === deptFilter)
      .filter(i => !priorityFilter || i.priority === priorityFilter)
      .filter(i => {
        if (!query) return true;
        const sid = shortId(i).toLowerCase();
        const dups = duplicatesByParent[String(i._id)] || [];
        const matchDup = dups.some(d =>
          d.title?.toLowerCase().includes(query) ||
          d.description?.toLowerCase().includes(query) ||
          shortId(d).toLowerCase().includes(query)
        );
        return (
          i.title?.toLowerCase().includes(query) ||
          i.description?.toLowerCase().includes(query) ||
          i.category?.toLowerCase().includes(query) ||
          sid.includes(query) ||
          matchDup
        );
      });

    return [...filtered].sort((a, b) => {
      if (sortBy === 'time_desc') {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (sortBy === 'time_asc') {
        return new Date(a.createdAt) - new Date(b.createdAt);
      }
      if (sortBy === 'priority_asc') {
        const pA = PRIORITY_RANK[a.priority] ?? 3;
        const pB = PRIORITY_RANK[b.priority] ?? 3;
        if (pA !== pB) return pB - pA;
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      // Default: priority_desc (High -> Medium -> Low, then newest)
      const pA = PRIORITY_RANK[a.priority] ?? 3;
      const pB = PRIORITY_RANK[b.priority] ?? 3;
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [issues, tab, deptFilter, priorityFilter, searchQuery, sortBy, TABS, duplicatesByParent]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = rows.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  useEffect(() => { setPage(1); }, [tab, deptFilter, priorityFilter, searchQuery, sortBy]);

  const replace = updated =>
    setIssues(list => list.map(i => (i._id === updated._id ? { ...i, ...updated } : i)));

  const [confirmDetachTarget, setConfirmDetachTarget] = useState(null); // { id, title }
  const [isDetaching, setIsDetaching] = useState(false);

  const executeDetach = async () => {
    if (!confirmDetachTarget?.id) return;
    const targetIssueId = confirmDetachTarget.id;
    setIsDetaching(true);
    try {
      const updated = await apiFetch(`/api/issues/${targetIssueId}/duplicate`, {
        method: 'PATCH',
        body: JSON.stringify({ duplicateOfId: null }),
      });
      replace(updated);
      load();
      setConfirmDetachTarget(null);
    } catch (err) {
      alert(err.message || 'Failed to detach issue');
    } finally {
      setIsDetaching(false);
    }
  };

  const selected = issues.find(i => i._id === selectedId) || null;

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

  const rootIssues = useMemo(() => issues.filter(i => !i.duplicateOf), [issues]);

  const counts = {
    all: rootIssues.length,
    unassigned: rootIssues.filter(TABS.unassigned).length,
    pending_verification: rootIssues.filter(TABS.pending_verification).length,
    unsatisfied: rootIssues.filter(TABS.unsatisfied).length,
    my_allotted: rootIssues.filter(TABS.my_allotted).length,
    issues: rootIssues.filter(TABS.issues).length,
    submitted: rootIssues.filter(TABS.submitted).length,
    in_progress: rootIssues.filter(TABS.in_progress).length,
    resolved: rootIssues.filter(TABS.resolved).length,
    closed: rootIssues.filter(TABS.closed).length,
    rejected: rootIssues.filter(TABS.rejected).length,
    overdue: rootIssues.filter(TABS.overdue).length,
  };

  const tabs = isAdmin
    ? [
        ['all', 'All Issues'],
        ['unassigned', 'Unassigned'],
        ['in_progress', 'In Progress'],
        ['pending_verification', 'Needs Verification'],
        ['unsatisfied', 'Citizen Unsatisfied'],
        ['resolved', 'Resolved'],
        ['closed', 'Closed'],
        ['rejected', 'Rejected'],
        ['overdue', 'Overdue SLA'],
      ]
    : [
        ['my_allotted', 'Allotted to Me'],
        ['issues', 'My Dept Queue'],
        ['in_progress', 'In Progress'],
        ['pending_verification', 'Pending Verification'],
        ['resolved', 'Resolved'],
        ['closed', 'Closed'],
        ['rejected', 'Rejected'],
        ['overdue', 'Overdue SLA'],
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
    <div className="min-h-screen bg-canvas text-ink font-sans">
      {/* ── Top Bar ── */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-surface/90 px-4 sm:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-ink">
            <span className="text-brand-600">Lok</span>Samadhan
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 sm:inline-flex border border-brand-100">
            <span className="size-1.5 rounded-full bg-brand-600 animate-pulse" />
            Command Portal
          </span>
          <span className="hidden items-center gap-2 border-l border-line pl-3 text-xs text-ink-muted lg:flex">
            <Icon name="building" className="size-4 text-slate-400" />
            {isAdmin ? 'All Departments (Administrator)' : department || 'General Administration'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => load(true)}
            title="Refresh live data"
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink cursor-pointer"
          >
            <Icon name="refresh" className={`size-3.5 ${refreshing ? 'animate-spin text-brand-600' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Syncing…' : 'Refresh'}</span>
          </button>

          <NotificationBell />

          <div className="h-5 w-px bg-line hidden sm:block" />

          <Link to="/profile" className="flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-canvas" title="My Profile">
            <Avatar name={user?.name} className="size-8 text-xs font-semibold" />
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-none text-ink">{user?.name}</p>
              <p className="mt-0.5 text-[10px] uppercase font-bold text-ink-muted tracking-wider">{user?.role}</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out"
            aria-label="Log out"
            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
          >
            <Icon name="logout" className="size-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* ── Sidebar Navigation ── */}
        <aside aria-label="Dashboard navigation" className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 border-r border-line bg-surface p-4 lg:flex lg:flex-col justify-between">
          <div className="space-y-6">
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">Operations</p>
              <nav className="space-y-1">
                <button
                  type="button"
                  onClick={() => setViewMode('issues')}
                  className={`flex w-full min-h-10 items-center justify-between rounded-xl px-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    viewMode === 'issues'
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                      : 'text-ink-muted hover:bg-canvas hover:text-ink'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="dashboard" className="size-4" />
                    Issues
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    viewMode === 'issues' ? 'bg-white/20 text-white' : 'bg-line text-ink-muted'
                  }`}>
                    {issues.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('analytics')}
                  className={`flex w-full min-h-10 items-center justify-between rounded-xl px-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    viewMode === 'analytics'
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                      : 'text-ink-muted hover:bg-canvas hover:text-ink'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Icon name="chart" className="size-4 shrink-0" />
                    <span className="truncate whitespace-nowrap">Analytics</span>
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                    viewMode === 'analytics' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    Live
                  </span>
                </button>
              </nav>
            </div>

            {isAdmin && (
              <div>
                <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">Administration</p>
                <nav className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('users')}
                    className={`flex w-full min-h-10 items-center justify-between rounded-xl px-3 text-sm font-medium transition-all duration-200 cursor-pointer ${
                      viewMode === 'users'
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-500/20'
                        : 'text-ink-muted hover:bg-canvas hover:text-ink'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon name="users" className="size-4 shrink-0" />
                      <span className="truncate whitespace-nowrap">Office Users</span>
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold shrink-0 ${
                      viewMode === 'users' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                    }`}>
                      Admin
                    </span>
                  </button>
                </nav>
              </div>
            )}

            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">Public Portal</p>
              <nav className="space-y-1">
                <Link
                  to="/feed"
                  className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                  <Icon name="clipboard" className="size-4" />
                  Public Feed
                </Link>
              </nav>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-canvas p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-ink">
              <Icon name="shield" className="size-4 text-brand-600" />
              Role: <span className="capitalize">{user?.role}</span>
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              {isAdmin ? 'System-wide administrative & staff control' : `Assigned: ${department || 'General Administration'}`}
            </p>
          </div>
        </aside>

        {/* ── Main Content Container ── */}
        <main className={`min-w-0 flex-1 p-4 sm:p-6 transition-all ${selected && viewMode === 'issues' ? 'xl:mr-[28rem]' : ''}`}>
          {/* Mobile View Switcher */}
          <div className="mb-6 flex overflow-x-auto gap-2 lg:hidden border-b border-line pb-3">
            <button
              type="button"
              onClick={() => setViewMode('issues')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'issues' ? 'bg-brand-600 text-white' : 'bg-surface text-ink-muted border border-line'
              }`}
            >
              <Icon name="dashboard" className="size-3.5" />
              Issues
            </button>
            <button
              type="button"
              onClick={() => setViewMode('analytics')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                viewMode === 'analytics' ? 'bg-brand-600 text-white' : 'bg-surface text-ink-muted border border-line'
              }`}
            >
              <Icon name="chart" className="size-3.5" />
              Analytics
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setViewMode('users')}
                className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                  viewMode === 'users' ? 'bg-brand-600 text-white' : 'bg-surface text-ink-muted border border-line'
                }`}
              >
                <Icon name="users" className="size-3.5" />
                Office Users
              </button>
            )}
          </div>

          {/* VIEW MODE: OFFICE USERS */}
          {viewMode === 'users' && isAdmin && (
            <OfficeUsersManager currentUser={user} />
          )}

          {/* VIEW MODE: ANALYTICS */}
          {viewMode === 'analytics' && (
            <AnalyticsView issues={issues} />
          )}

          {/* VIEW MODE: ISSUES QUEUE */}
          {viewMode === 'issues' && (
            <>
              {/* Welcome & Overview Header */}
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-ink">
                    {isAdmin ? 'Municipal Triage Center' : 'Department Officer Dashboard'}
                  </h1>
                  <p className="mt-0.5 text-xs sm:text-sm text-ink-muted">
                    Monitor incoming citizen complaints, resolve SLA bottlenecks, and dispatch issues.
                  </p>
                </div>

                {counts.overdue > 0 && (
                  <div className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-800 shadow-xs">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-rose-600" />
                    </span>
                    {counts.overdue} issue{counts.overdue === 1 ? '' : 's'} past SLA target deadline!
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                  <strong>Could not load issue queue:</strong> {error}
                </div>
              )}

              {loading ? (
                <Skeleton count={2} className="h-32" />
              ) : (
                <>
                  {/* Summary Metric Cards */}
                  <StatsCards issues={issues} />

                  {/* Main Queue Table Card */}
                  <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
                    {/* Header Controls: Queue Tabs, Search, Filters, Export */}
                    <div className="border-b border-line bg-surface px-4 py-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Queue Status Tabs */}
                        <div role="tablist" aria-label="Issue queue status" className="flex flex-wrap gap-1">
                          {tabs.map(([key, label]) => (
                            <button
                              key={key}
                              type="button"
                              role="tab"
                              aria-selected={tab === key}
                              onClick={() => setTab(key)}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                tab === key
                                  ? 'bg-brand-600 text-white font-semibold shadow-xs'
                                  : 'text-ink-muted hover:bg-canvas hover:text-ink'
                              }`}
                            >
                              {label}
                              <span className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                                tab === key ? 'bg-white/20 text-white' : 'bg-canvas text-ink-muted'
                              }`}>
                                {counts[key]}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={exportCsv}
                            disabled={rows.length === 0}
                            title="Export visible list to CSV"
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-canvas disabled:opacity-40"
                          >
                            <Icon name="download" className="size-3.5" />
                            <span className="hidden sm:inline">Export CSV</span>
                          </button>
                        </div>
                      </div>

                      {/* Search & Granular Filters Row */}
                      <div className="grid gap-2 sm:grid-cols-12 pt-2 border-t border-line/50">
                        {/* Search Input */}
                        <div className={`relative ${isAdmin ? 'sm:col-span-4' : 'sm:col-span-5'}`}>
                          <Icon name="search" className="absolute left-3 top-2.5 size-4 text-slate-400" />
                          <input
                            type="text"
                            placeholder="Search by title, description, category, or #ID..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg border border-line bg-canvas pl-9 pr-3 py-1.5 text-xs text-ink placeholder:text-slate-400 focus:border-brand-500 focus:bg-surface focus:outline-none"
                          />
                          {searchQuery && (
                            <button
                              type="button"
                              onClick={() => setSearchQuery('')}
                              className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-ink"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Priority Filter */}
                        <div className={isAdmin ? 'sm:col-span-2' : 'sm:col-span-3'}>
                          <select
                            aria-label="Filter Priority"
                            value={priorityFilter}
                            onChange={e => setPriorityFilter(e.target.value)}
                            className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink cursor-pointer focus:border-brand-500 focus:outline-none"
                          >
                            <option value="">All Priorities</option>
                            <option value="high">High Priority Only</option>
                            <option value="medium">Medium Priority</option>
                            <option value="low">Low Priority</option>
                          </select>
                        </div>

                        {/* Department Filter (Admin) */}
                        {isAdmin && (
                          <div className="sm:col-span-3">
                            <select
                              aria-label="Filter Department"
                              value={deptFilter}
                              onChange={e => setDeptFilter(e.target.value)}
                              className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink cursor-pointer focus:border-brand-500 focus:outline-none"
                            >
                              <option value="">All Departments</option>
                              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>
                        )}

                        {/* Sort By Dropdown */}
                        <div className={isAdmin ? 'sm:col-span-3' : 'sm:col-span-4'}>
                          <select
                            aria-label="Sort issues"
                            value={sortBy}
                            onChange={e => setSortBy(e.target.value)}
                            className="w-full rounded-lg border border-line bg-canvas px-2.5 py-1.5 text-xs text-ink font-medium cursor-pointer focus:border-brand-500 focus:outline-none"
                          >
                            <option value="priority_desc">Sort: Priority (High to Low)</option>
                            <option value="priority_asc">Sort: Priority (Low to High)</option>
                            <option value="time_desc">Sort: Time (Newest First)</option>
                            <option value="time_asc">Sort: Time (Oldest First)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Issue Rows Table */}
                    {rows.length === 0 ? (
                      <div className="p-12 text-center">
                        <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-400 mb-3">
                          <Icon name="search" className="size-6" />
                        </span>
                        <h3 className="text-sm font-semibold text-ink">No matching issues found</h3>
                        <p className="mt-1 text-xs text-ink-muted max-w-sm mx-auto">
                          {searchQuery || priorityFilter || deptFilter
                            ? 'Try clearing your search query or filters to see more results.'
                            : tab === 'overdue'
                            ? 'No unresolved issues have passed their department deadline.'
                            : 'This queue is currently empty.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-line bg-canvas/70 font-semibold uppercase tracking-wider text-ink-muted">
                              <tr>
                                <th scope="col" className="px-4 py-3">ID</th>
                                <th scope="col" className="px-4 py-3">Issue & Title</th>
                                <th scope="col" className="px-4 py-3">Department</th>
                                <th scope="col" className="px-4 py-3">Status</th>
                                <th
                                  scope="col"
                                  onClick={() => setSortBy(prev => prev === 'priority_desc' ? 'priority_asc' : 'priority_desc')}
                                  className="px-4 py-3 cursor-pointer select-none hover:text-brand-600 transition-colors group/th"
                                  title="Click to sort by Priority"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    Priority
                                    <span className={`text-[10px] ${sortBy.startsWith('priority') ? 'text-brand-600 font-bold' : 'text-slate-300 group-hover/th:text-slate-400'}`}>
                                      {sortBy === 'priority_desc' ? '▼' : sortBy === 'priority_asc' ? '▲' : '⇅'}
                                    </span>
                                  </span>
                                </th>
                                <th
                                  scope="col"
                                  onClick={() => setSortBy(prev => prev === 'time_desc' ? 'time_asc' : 'time_desc')}
                                  className="px-4 py-3 cursor-pointer select-none hover:text-brand-600 transition-colors group/th"
                                  title="Click to sort by Reported Time"
                                >
                                  <span className="inline-flex items-center gap-1">
                                    Reported
                                    <span className={`text-[10px] ${sortBy.startsWith('time') ? 'text-brand-600 font-bold' : 'text-slate-300 group-hover/th:text-slate-400'}`}>
                                      {sortBy === 'time_desc' ? '▼' : sortBy === 'time_asc' ? '▲' : '⇅'}
                                    </span>
                                  </span>
                                </th>
                                <th scope="col" className="px-4 py-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line">
                              {visible.map(issue => {
                                const overdue = isOverdue(issue);
                                const isSelected = selectedId === issue._id;
                                const dups = duplicatesByParent[String(issue._id)] || [];
                                const isExpanded = Boolean(expanded[issue._id]);

                                return (
                                  <Fragment key={issue._id}>
                                    <tr
                                      onClick={() => setSelectedId(issue._id)}
                                      className={`group cursor-pointer transition-colors hover:bg-brand-50/40 ${
                                        isSelected ? 'bg-brand-50/80 font-medium' : ''
                                      }`}
                                    >
                                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-brand-600">
                                        #{shortId(issue)}
                                      </td>

                                      <td className="max-w-xs px-4 py-3">
                                        <span className="block truncate font-semibold text-ink group-hover:text-brand-700">
                                          {issue.title}
                                        </span>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
                                          <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px]">
                                            {issue.category}
                                          </span>
                                          {dups.length > 0 && (
                                            <button
                                              type="button"
                                              onClick={e => toggleExpand(issue._id, e)}
                                              className="inline-flex items-center gap-1 rounded-full bg-brand-50 hover:bg-brand-100 text-brand-700 px-2 py-0.5 text-[10px] font-semibold border border-brand-200 transition-colors cursor-pointer"
                                              title="Toggle similar reports grouped under this issue"
                                            >
                                              <span className="text-[9px]">{isExpanded ? '▼' : '▶'}</span>
                                              <span>+{dups.length} similar report{dups.length === 1 ? '' : 's'}</span>
                                            </button>
                                          )}
                                        </div>
                                      </td>

                                      <td className="px-4 py-3 text-ink-muted">
                                        {issue.department ? (
                                          <div>
                                            <span className="inline-flex items-center gap-1 text-ink font-medium">
                                              <Icon name="building" className="size-3 text-slate-400" />
                                              {issue.department}
                                            </span>
                                            {issue.assignedOfficer?.name ? (
                                              <span className="block text-[10px] text-slate-500 truncate">
                                                🛡 {issue.assignedOfficer.name} {issue.assignedOfficer.region ? `(${issue.assignedOfficer.region})` : ''}
                                              </span>
                                            ) : (
                                              <span className="block text-[10px] text-amber-600 font-medium">
                                                ⚠ Unassigned Officer
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="italic text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px]">
                                            Unassigned
                                          </span>
                                        )}
                                      </td>

                                      <td className="px-4 py-3">
                                        <StatusPill status={issue.status} />
                                      </td>

                                      <td className="px-4 py-3">
                                        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] border capitalize ${
                                          PRIORITY_BADGES[issue.priority] || 'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}>
                                          {issue.priority === 'high' && <span className="size-1.5 rounded-full bg-red-500" />}
                                          {issue.priority === 'medium' && <span className="size-1.5 rounded-full bg-amber-500" />}
                                          {issue.priority === 'low' && <span className="size-1.5 rounded-full bg-slate-400" />}
                                          {issue.priority || 'Normal'}
                                        </span>
                                      </td>

                                      <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
                                        {age(issue.createdAt)}
                                        {overdue && (
                                          <span
                                            title={`Category: ${issue.category || 'General'} • SLA Target: ${issue.sla?.targetDays || 7} days • ${issue.sla?.breachDays || 1}d overdue`}
                                            className="ml-1.5 inline-flex items-center gap-0.5 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700"
                                          >
                                            Overdue ({issue.sla?.targetDays || 7}d SLA)
                                          </span>
                                        )}
                                      </td>

                                      <td className="px-4 py-3 text-right">
                                        <button
                                          type="button"
                                          onClick={e => { e.stopPropagation(); setSelectedId(issue._id); }}
                                          className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                                        >
                                          Inspect
                                        </button>
                                      </td>
                                    </tr>

                                    {/* Sub-rows: Similar reports grouped under this original issue */}
                                    {isExpanded && (() => {
                                      const limit = expandedLimits[issue._id] || 3;
                                      const visibleDups = dups.slice(0, limit);
                                      const remaining = dups.length - limit;

                                      return (
                                        <>
                                          {visibleDups.map(dup => {
                                            const isDupSelected = selectedId === dup._id;
                                            return (
                                              <tr
                                                key={dup._id}
                                                onClick={() => setSelectedId(dup._id)}
                                                className={`border-l-4 border-brand-400 bg-canvas/60 hover:bg-brand-50/50 cursor-pointer transition-colors text-xs ${
                                                  isDupSelected ? 'bg-brand-50/90 font-medium' : ''
                                                }`}
                                              >
                                                <td className="whitespace-nowrap pl-8 pr-4 py-2.5 font-mono text-[11px] text-brand-600">
                                                  ↳ #{shortId(dup)}
                                                </td>
                                                <td className="px-4 py-2.5 max-w-xs">
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-ink truncate">{dup.title}</span>
                                                    <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[9px] font-semibold shrink-0">
                                                      Similar
                                                    </span>
                                                    {dup.photos?.length > 0 && (
                                                      <span className="text-[10px] text-ink-muted flex items-center gap-0.5 shrink-0">
                                                        <Icon name="photo" className="size-3" /> {dup.photos.length}
                                                      </span>
                                                    )}
                                                  </div>
                                                  {dup.description && (
                                                    <p className="text-[11px] text-ink-muted truncate mt-0.5">{dup.description}</p>
                                                  )}
                                                </td>
                                                <td className="px-4 py-2.5 text-ink-muted text-xs">
                                                  <span className="text-[11px] italic text-ink-muted">Same as original</span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                  <StatusPill status={dup.status} size="sm" />
                                                </td>
                                                <td className="px-4 py-2.5 text-ink-muted text-xs capitalize">
                                                  {dup.priority || 'Normal'}
                                                </td>
                                                <td className="px-4 py-2.5 text-ink-muted text-xs">
                                                  {age(dup.createdAt)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-1.5">
                                                  <button
                                                    type="button"
                                                    onClick={e => { e.stopPropagation(); setSelectedId(dup._id); }}
                                                    className="rounded border border-line bg-surface px-2 py-0.5 text-[10px] font-medium text-brand-600 hover:bg-brand-50"
                                                  >
                                                    Inspect
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={e => {
                                                      e.stopPropagation();
                                                      setConfirmDetachTarget({ id: dup._id, title: dup.title });
                                                    }}
                                                    className="rounded border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 hover:bg-rose-100 cursor-pointer"
                                                    title="Detach this similar report into an independent report"
                                                  >
                                                    Detach
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })}

                                          {dups.length > 3 && (
                                            <tr className="border-l-4 border-brand-400 bg-canvas/80 text-xs">
                                              <td colSpan={7} className="pl-8 pr-4 py-2">
                                                <div className="flex items-center justify-between text-xs">
                                                  <span className="text-[11px] text-ink-muted italic">
                                                    Showing {visibleDups.length} of {dups.length} similar reports
                                                  </span>
                                                  {limit < dups.length ? (
                                                    <button
                                                      type="button"
                                                      onClick={e => {
                                                        e.stopPropagation();
                                                        setExpandedLimits(prev => ({ ...prev, [issue._id]: (prev[issue._id] || 3) + 5 }));
                                                      }}
                                                      className="font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer text-xs"
                                                    >
                                                      Show more (+{remaining} more)
                                                    </button>
                                                  ) : (
                                                    <button
                                                      type="button"
                                                      onClick={e => {
                                                        e.stopPropagation();
                                                        setExpandedLimits(prev => ({ ...prev, [issue._id]: 3 }));
                                                      }}
                                                      className="font-semibold text-brand-600 hover:text-brand-700 hover:underline cursor-pointer text-xs"
                                                    >
                                                      Show less
                                                    </button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-canvas/40 px-4 py-3 text-xs text-ink-muted">
                          <span>
                            Showing {(current - 1) * PER_PAGE + 1}&ndash;
                            {Math.min(current * PER_PAGE, rows.length)} of {rows.length} issues
                          </span>

                          {pageCount > 1 && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPage(current - 1)}
                                disabled={current === 1}
                                aria-label="Previous page"
                                className="cursor-pointer rounded-lg border border-line bg-surface p-1.5 transition-colors hover:bg-canvas disabled:opacity-40"
                              >
                                <Icon name="left" className="size-3.5" />
                              </button>
                              <span className="px-2 font-medium tabular-nums text-ink">
                                Page {current} of {pageCount}
                              </span>
                              <button
                                type="button"
                                onClick={() => setPage(current + 1)}
                                disabled={current === pageCount}
                                aria-label="Next page"
                                className="cursor-pointer rounded-lg border border-line bg-surface p-1.5 transition-colors hover:bg-canvas disabled:opacity-40"
                              >
                                <Icon name="right" className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── Slide-out Inspection Drawer ── */}
      {selected && viewMode === 'issues' && (
        <IssueDrawer
          issue={selected}
          linkedDuplicates={duplicatesByParent[String(selected._id)] || []}
          onClose={() => setSelectedId(null)}
          onSaved={replace}
          onUpdateStatus={setEditing}
          onSelectIssue={setSelectedId}
          onRefresh={load}
        />
      )}

      {/* ── Status Update Modal ── */}
      {editing && viewMode === 'issues' && (
        <StatusModal
          issue={editing}
          onClose={() => setEditing(null)}
          onSaved={replace}
        />
      )}

      {/* ── Custom Detach Confirmation Modal ── */}
      <ConfirmDialog
        isOpen={Boolean(confirmDetachTarget)}
        title="Detach similar issue?"
        message={
          <>
            Are you sure you want to detach{' '}
            <strong className="font-semibold text-slate-900">
              {confirmDetachTarget?.title ? `"${confirmDetachTarget.title}"` : 'this issue'}
            </strong>
            ?
            <br />
            It will become an independent, standalone report in the dashboard queue with its own lifecycle, officer assignment, and status.
          </>
        }
        confirmText="Detach report"
        cancelText="Cancel"
        tone="danger"
        isPending={isDetaching}
        onConfirm={executeDetach}
        onClose={() => !isDetaching && setConfirmDetachTarget(null)}
      />
    </div>
  );
}

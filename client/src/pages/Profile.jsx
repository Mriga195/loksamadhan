import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import EmptyState from '../components/EmptyState';
import StatusPill from '../components/StatusPill';
import { timeAgo } from '../components/IssueCard';
import Spinner, { Skeleton } from '../components/Spinner';
import { PasswordField } from '../components/AuthShell';
import { field, primaryBtn } from '../formStyles';

const BUCKET = {
  Submitted: 'pending',
  Acknowledged: 'progress',
  'In Progress': 'progress',
  'Pending Verification': 'progress',
  Resolved: 'resolved',
  Closed: 'closed',
  Unsatisfied: 'closed',
};

const OVERVIEW = [
  { key: 'all', label: 'Total reports', icon: 'clipboard', tone: 'bg-brand-50 text-brand-600' },
  { key: 'pending', label: 'Pending', icon: 'clock', tone: 'bg-acknowledged-50 text-acknowledged-600' },
  { key: 'progress', label: 'In progress', icon: 'refresh', tone: 'bg-progress-50 text-progress-600' },
  { key: 'resolved', label: 'Resolved', icon: 'check', tone: 'bg-resolved-50 text-resolved-600' },
  { key: 'closed', label: 'Closed', icon: 'shield', tone: 'bg-slate-100 text-slate-600' },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'progress', label: 'In progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, loading: authLoading, updateUser } = useAuth();
  const isCitizen = user?.role === 'citizen';

  // Profile edit form state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [changePassword, setChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Complaints state (citizens only)
  const [complaints, setComplaints] = useState([]);
  const [complaintsLoading, setComplaintsLoading] = useState(isCitizen);
  const [complaintsError, setComplaintsError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('latest');

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login', { state: { from: '/profile' }, replace: true });
    }
  }, [authLoading, user, navigate]);

  // Sync profile details into form
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  // Fetch my complaints (citizens only)
  useEffect(() => {
    if (!user || user.role !== 'citizen') {
      setComplaintsLoading(false);
      return;
    }
    let stale = false;
    setComplaintsLoading(true);
    setComplaintsError(null);

    apiFetch('/api/issues/mine')
      .then((data) => {
        if (!stale) setComplaints(data.items || []);
      })
      .catch((err) => {
        if (!stale) setComplaintsError(err.message || 'Failed to load complaints');
      })
      .finally(() => {
        if (!stale) setComplaintsLoading(false);
      });

    return () => { stale = true; };
  }, [user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (changePassword) {
      if (!currentPassword) {
        setError('Please enter your current password.');
        return;
      }
      if (newPassword.length < 6) {
        setError('New password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('New password and confirmation do not match.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = { name: name.trim(), email: email.trim().toLowerCase() };
      if (changePassword) {
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await apiFetch('/api/auth/me', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      updateUser(res.user);
      setSuccess('Profile updated successfully!');
      setEditing(false);
      setChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditing(false);
    setError(null);
    setSuccess(null);
    setChangePassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
    }
  };


  if (authLoading || (!user && !authLoading)) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-10">
        <Skeleton count={3} className="h-28" />
      </main>
    );
  }

  const filtered = complaints
    .filter(c => statusFilter === 'all' || BUCKET[c.status] === statusFilter)
    .sort((a, b) => sort === 'oldest'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt));

  const counts = {
    all: complaints.length,
    pending: complaints.filter(c => BUCKET[c.status] === 'pending').length,
    progress: complaints.filter(c => BUCKET[c.status] === 'progress').length,
    resolved: complaints.filter(c => BUCKET[c.status] === 'resolved').length,
    closed: complaints.filter(c => BUCKET[c.status] === 'closed').length,
  };

  const memberDate = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : 'Recent member';

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* ── Header: the skyline is the whole card, identity sits on top of it ── */}
      <section className="relative overflow-hidden rounded-card border border-line
        bg-gradient-to-b from-brand-100 to-brand-50 shadow-sm">
        <img src="/profile-banner.webp" alt="" aria-hidden="true"
          className="absolute inset-0 size-full object-cover object-center" />
        {/* The illustration is pale, but not uniformly: this keeps the name and the meta row
            on an even ground instead of letting a rooftop run through them. */}
        <div aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-surface/95 via-surface/70 to-surface/25" />

        <div className="relative px-5 py-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <span className="rounded-full bg-surface p-1 shadow-sm ring-4 ring-surface">
                <Avatar name={user.name} className="size-20 text-2xl font-bold sm:size-24" />
              </span>
              <div className="mb-1 min-w-0">
                <h1 className="truncate text-2xl font-bold sm:text-3xl">{user.name}</h1>
                <p className="truncate text-sm text-ink-muted">{user.email}</p>
              </div>
            </div>

            {!editing && (
              <button
                type="button"
                onClick={() => { setEditing(true); setError(null); setSuccess(null); }}
                className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2
                  self-start rounded-lg border border-line bg-surface px-4 text-sm font-medium
                  shadow-sm transition-colors hover:bg-canvas sm:self-auto"
              >
                <Icon name="pencil" className="size-4" />
                Edit profile
              </button>
            )}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 border-t
            border-line/70 pt-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="clock" className="size-4" />
              Member since {memberDate}
            </span>
            <span className="inline-flex items-center gap-1.5 capitalize">
              <Icon name="shield" className="size-4" />
              {user.role}
            </span>
            {user.department && (
              <span className="flex items-center gap-1.5">
                <Icon name="building" className="size-4" />
                {user.department}
              </span>
            )}
            {isCitizen && (
              <span className="flex items-center gap-1.5">
                <Icon name="clipboard" className="size-4" />
                {counts.all} issue{counts.all === 1 ? '' : 's'} reported
              </span>
            )}
          </div>
        </div>
      </section>

      {success && !editing && (
        <p className="mt-4 flex items-center gap-2 rounded-card border border-line bg-resolved-50
          p-4 text-sm font-medium text-resolved-600">
          <Icon name="check" className="size-5" />
          {success}
        </p>
      )}

      {/* ── Edit form ── */}
      {editing && (
        <section className="mt-6 rounded-card border border-brand-200 bg-brand-50/40 p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-brand-100 pb-3">
            <h2 className="text-lg font-semibold">Edit your details</h2>
            <button type="button" onClick={cancelEdit}
              className="cursor-pointer text-sm text-ink-muted hover:text-ink">
              Cancel
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
              {error}
            </p>
          )}

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Full name
                <input id="edit-name" type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`${field} mt-1`} placeholder="Your full name" />
              </label>
              <label className="block text-sm font-medium">
                Email address
                <input id="edit-email" type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${field} mt-1`} placeholder="you@example.com" />
              </label>
            </div>

            <div className="border-t border-line/60 pt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="size-4 rounded border-line text-brand-600" />
                Change password
              </label>
            </div>

            {changePassword && (
              <div className="grid gap-4 rounded-card border border-line bg-surface p-4 sm:grid-cols-3">
                <PasswordField className="" label="Current password" required
                  value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••" />
                <PasswordField className="" label="New password" required minLength={6}
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 chars" />
                <PasswordField className="" label="Confirm new password" required
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password" />
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
              <button type="button" onClick={cancelEdit} disabled={saving}
                className="min-h-13 w-full cursor-pointer rounded-lg border border-line bg-surface
                  px-5 text-base font-medium shadow-sm transition-colors hover:bg-canvas sm:w-auto">
                Cancel
              </button>
              <button type="submit" disabled={saving} className={`${primaryBtn} w-full sm:w-auto`}>
                {saving && <Spinner label="Saving" />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </section>
      )}

      {isCitizen ? (
        <>
          {/* ── Overview tiles ── */}
          <h2 className="mt-8 text-lg font-semibold">Overview</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {OVERVIEW.map(({ key, label, icon, tone }) => (
              <article key={key}
                className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-sm">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>
                  <Icon name={icon} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xl font-bold tabular-nums">{counts[key]}</span>
                  <span className="block truncate text-xs text-ink-muted">{label}</span>
                </span>
              </article>
            ))}
          </div>

          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            {/* ── My reports ── */}
            <section>
              <h2 className="text-lg font-semibold">My reports</h2>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {TABS.map(({ key, label }) => (
                  <button key={key} type="button" onClick={() => setStatusFilter(key)}
                    className={`inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full
                      border px-3.5 text-sm transition-colors ${statusFilter === key
                        ? 'border-brand-600 bg-brand-600 font-medium text-white'
                        : 'border-line bg-surface text-ink hover:bg-canvas'}`}>
                    {label}
                    <span className={statusFilter === key ? 'text-white/80' : 'text-ink-muted'}>
                      ({counts[key]})
                    </span>
                  </button>
                ))}

                <select aria-label="Sort reports" value={sort} onChange={e => setSort(e.target.value)}
                  className="ml-auto h-9 cursor-pointer rounded-lg border border-line bg-surface
                    px-3 text-sm shadow-sm">
                  <option value="latest">Latest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </div>

              <div className="mt-4">
                {complaintsLoading && <Skeleton count={3} className="h-28" />}

                {!complaintsLoading && complaintsError && (
                  <p className="rounded-card bg-rejected-50 px-4 py-3 text-sm text-rejected-600">
                    {complaintsError}
                  </p>
                )}

                {!complaintsLoading && !complaintsError && filtered.length === 0 && (
                  <EmptyState
                    title={statusFilter === 'all' ? 'No reports yet' : 'Nothing in this bucket'}
                    hint={statusFilter === 'all'
                      ? 'When you report a pothole, water leak or broken light, you can track it here.'
                      : 'Try another filter to see your other reports.'}
                    actionLabel={statusFilter === 'all' ? 'Report your first issue' : undefined}
                    onAction={statusFilter === 'all' ? () => navigate('/report') : undefined}
                  />
                )}

                {/* The rail ties the numbered rows together into one thread of activity. */}
                {!complaintsLoading && !complaintsError && filtered.length > 0 && (
                  <ol className="relative space-y-3 sm:border-l sm:border-line sm:pl-8">
                    {filtered.map((issue, i) => (
                      <ReportRow key={issue._id} issue={issue} n={i + 1} />
                    ))}
                  </ol>
                )}
              </div>
            </section>

            {/* ── Sidebar ── */}
            <aside className="space-y-5">
              <section className="rounded-card border border-line bg-surface p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon name="sparkles" className="size-4 text-brand-600" />
                  Quick actions
                </h2>
                <div className="mt-3 space-y-1">
                  {/* Only routes that exist — a "Saved drafts" or "Settings" row would be a
                      button that goes nowhere. */}
                  <Link to="/report" className={quickAction}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                      <Icon name="plus" className="size-[18px]" />
                    </span>
                    File a new issue
                  </Link>
                  <Link to="/feed" className={quickAction}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-resolved-50 text-resolved-600">
                      <Icon name="home" className="size-[18px]" />
                    </span>
                    Browse the public feed
                  </Link>
                  <Link to="/departments" className={quickAction}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-acknowledged-50 text-acknowledged-600">
                      <Icon name="building" className="size-[18px]" />
                    </span>
                    Departments
                  </Link>
                </div>
              </section>

              <section className="rounded-card border border-brand-100 bg-brand-50/60 p-5">
                <h2 className="text-sm font-semibold">Your impact</h2>
                <Trend complaints={complaints} />
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[['Reported', counts.all], ['Resolved', counts.resolved], ['In progress', counts.progress]]
                    .map(([label, value]) => (
                      <div key={label}>
                        <dd className="text-xl font-bold tabular-nums">{value}</dd>
                        <dt className="text-[11px] leading-tight text-ink-muted">{label}</dt>
                      </div>
                    ))}
                </dl>
                <p className="mt-4 text-xs text-ink-muted">
                  Thank you for helping make your community better.
                </p>
              </section>

              <section className="rounded-card border border-line bg-surface p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Icon name="info" className="size-4 text-brand-600" />
                  Tips
                </h2>
                <p className="mt-2 text-xs text-ink-muted">
                  Add photos and an exact location — reports with both are triaged faster, and
                  a clear title helps us link duplicates instead of splitting the support.
                </p>
              </section>
            </aside>
          </div>
        </>
      ) : (
        /* ── Officer & admin: this page is not a report list for them ── */
        <section className="mt-6 rounded-card border border-line bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name="dashboard" />
                </span>
                <h2 className="text-xl font-bold">Municipal portal</h2>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                You are signed in with municipal authority as an{' '}
                <span className="font-medium capitalize text-ink">{user.role}</span>. Manage
                incoming civic reports, triage queues and resolve citizen issues on the dashboard.
              </p>
            </div>

            <Link to="/dashboard" className={`${primaryBtn} shrink-0`}>
              <Icon name="dashboard" />
              Go to dashboard
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-line bg-canvas p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Department</span>
              <p className="mt-1 text-base font-semibold">
                {user.department || 'All departments (administrator)'}
              </p>
            </div>
            <div className="rounded-card border border-line bg-canvas p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Role &amp; privileges</span>
              <p className="mt-1 text-base font-semibold capitalize">
                {user.role} — triage, assignment &amp; resolution
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

const quickAction = 'flex min-h-12 items-center gap-3 rounded-lg px-2 text-sm font-medium' +
  ' transition-colors hover:bg-canvas';

// One row of the report thread: rail number, thumbnail, the three lines that identify a report,
// and the status. The whole row is one link, so it is a single tab stop.
function ReportRow({ issue, n }) {
  const place = issue.address || issue.area;
  const photo = issue.photos?.[0];

  return (
    <li className="relative">
      <span aria-hidden="true"
        className="absolute -left-11 top-6 hidden size-6 place-items-center rounded-full
          bg-brand-600 text-[10px] font-bold text-white ring-4 ring-canvas sm:grid">
        {String(n).padStart(2, '0')}
      </span>

      <Link to={`/issues/${issue._id}`}
        className="flex items-start gap-3 rounded-card border border-line bg-surface p-3
          shadow-sm transition-colors hover:bg-canvas sm:gap-4 sm:p-4">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg
          bg-canvas text-slate-300 sm:size-20">
          {photo
            ? <img src={photo} alt="" loading="lazy" className="size-full object-cover"
                onError={e => { e.currentTarget.hidden = true; }} />
            : <Icon name="photo" className="size-7" />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <span className="line-clamp-2 text-sm font-semibold sm:text-base">{issue.title}</span>
            <StatusPill status={issue.status} className="shrink-0" />
          </span>

          <span className="mt-1 block text-xs text-ink-muted">
            {place || 'Location not given'} · {timeAgo(issue.createdAt)}
          </span>

          {issue.description && (
            <span className="mt-1 line-clamp-1 block text-xs text-ink-muted">{issue.description}</span>
          )}

          <span className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2 py-1 font-medium">
              <span className="size-1.5 rounded-full bg-brand-600" />
              {issue.department || issue.category}
            </span>
            {issue.duplicateCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 px-2 py-1
                font-medium text-brand-700">
                {issue.duplicateCount} similar report{issue.duplicateCount === 1 ? '' : 's'}
              </span>
            )}
            {issue.priority && issue.priority !== 'low' && (
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-medium capitalize ${
                issue.priority === 'high'
                  ? 'bg-rejected-50 text-rejected-600'
                  : 'bg-acknowledged-50 text-acknowledged-600'}`}>
                {issue.priority}
              </span>
            )}
          </span>
        </span>

        <Icon name="right" className="mt-1 size-5 shrink-0 self-center text-slate-300" />
      </Link>
    </li>
  );
}

// Six months of "reports filed", drawn from the same list the page already has — no extra
// endpoint. A flat line is the honest picture of one quiet month, so no smoothing.
function Trend({ complaints }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleDateString('en-US', { month: 'short' }),
      count: complaints.filter(c => {
        const t = new Date(c.createdAt);
        return t.getFullYear() === d.getFullYear() && t.getMonth() === d.getMonth();
      }).length,
    };
  });

  const max = Math.max(1, ...months.map(m => m.count));
  const points = months
    .map((m, i) => `${(i / (months.length - 1)) * 100},${28 - (m.count / max) * 24}`)
    .join(' ');

  return (
    <>
      <svg viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"
        className="mt-3 h-16 w-full text-brand-600">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5"
          vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="flex justify-between text-[10px] text-ink-muted">
        {months.map(m => <span key={m.label}>{m.label}</span>)}
      </div>
      <span className="sr-only">
        Reports filed per month: {months.map(m => `${m.label} ${m.count}`).join(', ')}.
      </span>
    </>
  );
}

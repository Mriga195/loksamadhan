import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import IssueCard from '../components/IssueCard';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/Spinner';

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
      <main className="mx-auto max-w-5xl px-4 py-10">
        <Skeleton count={3} className="h-28" />
      </main>
    );
  }

  // Filter complaints by status tab (citizen only)
  const filteredComplaints = complaints.filter((c) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'in_progress') return c.status === 'In Progress' || c.status === 'Acknowledged';
    return c.status.toLowerCase() === statusFilter.toLowerCase();
  });

  const counts = {
    all: complaints.length,
    submitted: complaints.filter((c) => c.status === 'Submitted').length,
    inProgress: complaints.filter((c) => c.status === 'In Progress' || c.status === 'Acknowledged').length,
    resolved: complaints.filter((c) => c.status === 'Resolved').length,
  };

  const memberDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent member';

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* ── Profile Header Card ── */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
        <div className="h-28 bg-gradient-to-r from-brand-600 to-indigo-700 sm:h-36" />
        <div className="relative px-6 pb-6 pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between -mt-12 sm:-mt-14 mb-4">
            <div className="flex items-end gap-4">
              <div className="rounded-full ring-4 ring-surface bg-surface p-1 shadow-md">
                <Avatar name={user.name} className="size-20 sm:size-24 text-2xl font-bold" />
              </div>
              <div className="mb-1">
                <h1 className="text-2xl font-bold text-ink sm:text-3xl">{user.name}</h1>
                <p className="text-sm text-ink-muted">{user.email || 'Citizen of Tezpur'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                user.role === 'admin'
                  ? 'bg-purple-100 text-purple-700'
                  : user.role === 'officer'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}>
                {user.role}
              </span>

              {!editing && (
                <button
                  type="button"
                  onClick={() => { setEditing(true); setError(null); setSuccess(null); }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas hover:border-slate-300"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                  </svg>
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-line pt-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="clock" className="size-4 text-slate-400" />
              Member since {memberDate}
            </span>
            {user.department && (
              <span className="flex items-center gap-1.5">
                <Icon name="building" className="size-4 text-slate-400" />
                Department: {user.department}
              </span>
            )}
            {isCitizen && (
              <span className="flex items-center gap-1.5">
                <Icon name="clipboard" className="size-4 text-slate-400" />
                {counts.all} issue{counts.all === 1 ? '' : 's'} reported
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ── Edit Profile Form (conditional) ── */}
      {editing && (
        <section className="mt-6 rounded-2xl border border-brand-200 bg-brand-50/30 p-6 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between border-b border-brand-100 pb-3">
            <h2 className="text-lg font-semibold text-ink">Edit Self Details</h2>
            <button type="button" onClick={cancelEdit} className="text-ink-muted hover:text-ink text-sm cursor-pointer">
              ✕ Cancel
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-name" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label htmlFor="edit-email" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  id="edit-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Change Password toggle */}
            <div className="border-t border-line/60 pt-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  checked={changePassword}
                  onChange={(e) => setChangePassword(e.target.checked)}
                  className="size-4 rounded border-line text-brand-600 focus:ring-brand-500"
                />
                Change Password
              </label>
            </div>

            {changePassword && (
              <div className="grid gap-4 rounded-xl border border-line bg-surface p-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="edit-current-pw" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                    Current Password
                  </label>
                  <input
                    id="edit-current-pw"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label htmlFor="edit-new-pw" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                    New Password
                  </label>
                  <input
                    id="edit-new-pw"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
                    placeholder="Min. 6 chars"
                  />
                </div>
                <div>
                  <label htmlFor="edit-confirm-pw" className="block text-xs font-semibold text-ink-muted uppercase tracking-wider mb-1">
                    Confirm New Password
                  </label>
                  <input
                    id="edit-confirm-pw"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-500 focus:outline-none"
                    placeholder="Repeat new password"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                disabled={saving}
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-canvas transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>
      )}

      {success && !editing && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800 flex items-center gap-2">
          <Icon name="check" className="size-5 text-emerald-600" />
          {success}
        </div>
      )}

      {/* ── Citizen Only: My Complaints Section ── */}
      {isCitizen ? (
        <section className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">My Complaints</h2>
              <p className="text-sm text-ink-muted">All civic reports submitted from your account.</p>
            </div>

            <Link
              to="/report"
              className="inline-flex items-center gap-2 self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              <Icon name="plus" className="size-4" />
              File New Issue
            </Link>
          </div>

          {/* Status filter tabs */}
          <div className="mt-5 flex flex-wrap items-center gap-2 border-b border-line pb-3">
            {[
              { key: 'all', label: 'All', count: counts.all },
              { key: 'Submitted', label: 'Pending', count: counts.submitted },
              { key: 'in_progress', label: 'In Progress', count: counts.inProgress },
              { key: 'Resolved', label: 'Resolved', count: counts.resolved },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${
                  statusFilter === key
                    ? 'bg-brand-600 text-white'
                    : 'bg-canvas text-ink-muted hover:bg-slate-200/60 hover:text-ink'
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.2 rounded-full ${statusFilter === key ? 'bg-white/20 text-white' : 'bg-line text-ink-muted'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Complaints list */}
          <div className="mt-5">
            {complaintsLoading && <Skeleton count={3} className="h-28" />}

            {!complaintsLoading && complaintsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {complaintsError}
              </div>
            )}

            {!complaintsLoading && !complaintsError && filteredComplaints.length === 0 && (
              <EmptyState
                title={statusFilter === 'all' ? 'No complaints reported yet' : `No complaints with status "${statusFilter}"`}
                hint={statusFilter === 'all'
                  ? 'When you report road potholes, water leaks, or broken lights, you can track their resolution here.'
                  : 'Try choosing another status filter above to see your other reports.'}
                actionLabel={statusFilter === 'all' ? 'Report your first issue' : undefined}
                onAction={statusFilter === 'all' ? () => navigate('/report') : undefined}
              />
            )}

            {!complaintsLoading && !complaintsError && filteredComplaints.length > 0 && (
              <div className="space-y-4">
                {filteredComplaints.map((issue, idx) => (
                  <IssueCard key={issue._id} issue={issue} index={idx + 1} />
                ))}
              </div>
            )}
          </div>
        </section>
      ) : (
        /* ── Officer & Admin Quick Access ── */
        <section className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon name="dashboard" />
                </span>
                <h2 className="text-xl font-bold text-ink">Municipal Portal</h2>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                You are signed in with municipal authority as an <span className="font-medium text-ink capitalize">{user.role}</span>. Manage incoming civic reports, triage queues, and resolve citizen issues on the dashboard.
              </p>
            </div>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 shrink-0 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition-colors"
            >
              <Icon name="dashboard" />
              Go to Dashboard
            </Link>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-canvas p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Department</span>
              <p className="mt-1 text-base font-semibold text-ink">
                {user.department || 'All Departments (Administrator)'}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-canvas p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Role & Privileges</span>
              <p className="mt-1 text-base font-semibold text-ink capitalize">
                {user.role} — Triage, Assignment & Resolution
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

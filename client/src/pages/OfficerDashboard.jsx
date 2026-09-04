import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import AssignControls from '../components/AssignControls';
import StatusModal from '../components/StatusModal';
import StatsCards from '../components/StatsCards';
import StatusPill from '../components/StatusPill';

// Officer and admin share this page. Admin is a `role === 'admin'` branch, not a second file —
// the two views differ by one filter and two extra widgets, and a second page would be two
// places to fix every bug.

const PRIORITY_TEXT = {
  high: 'text-priority-high font-semibold',
  medium: 'text-priority-medium',
  low: 'text-priority-low',
};
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

const age = iso => {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (days > 0) return `${days}d ago`;
  const hours = Math.floor((Date.now() - new Date(iso)) / 3600000);
  return hours > 0 ? `${hours}h ago` : 'just now';
};

export default function OfficerDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const department = user?.department;

  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '100', duplicates: 'include' });
      // Officers see their own department. Admins see everything.
      if (!isAdmin && department) params.set('department', department);
      const data = await apiFetch(`/api/issues?${params}`);
      setIssues(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, department]);

  useEffect(() => { load(); }, [load]);

  // The officer's actual job is triage, so the default order is priority then age.
  // Unassigned issues have no department, so that filter is applied here rather than server-side
  // — `?department=` would exclude exactly the rows the queue is for.
  const rows = useMemo(() => {
    const filtered = unassignedOnly ? issues.filter(i => !i.department) : issues;
    return [...filtered].sort((a, b) =>
      (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3)
      || new Date(a.createdAt) - new Date(b.createdAt));
  }, [issues, unassignedOnly]);

  // One updated issue back from a PATCH replaces its row; no refetch of the whole table.
  const replace = updated =>
    setIssues(list => list.map(i => (i._id === updated._id ? { ...i, ...updated } : i)));

  return (
    <main className="mx-auto max-w-6xl p-4 md:p-8">
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-semibold">
          {isAdmin ? 'All issues' : `${department || 'My'} queue`}
        </h1>
        <span className="text-sm text-ink-muted">{total} total</span>
      </header>

      {isAdmin && <div className="mb-6"><StatsCards /></div>}

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={unassignedOnly}
          onChange={e => setUnassignedOnly(e.target.checked)}
        />
        Unassigned only
      </label>

      {error && <p className="text-sm text-rejected-600">Could not load issues: {error}</p>}
      {loading && <p className="text-sm text-ink-muted">Loading…</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-ink-muted">
          {unassignedOnly ? 'Nothing unassigned. ' : 'No issues here yet. '}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase text-ink-muted">
              <tr>
                <th className="p-3">Issue</th>
                <th className="p-3">Category</th>
                <th className="p-3">Status</th>
                <th className="p-3">Priority</th>
                <th className="p-3">Age</th>
                <th className="p-3">Support</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(issue => (
                <tr key={issue._id} className="border-b border-line last:border-0 align-top">
                  <td className="max-w-xs p-3">
                    <div className="truncate font-medium">{issue.title}</div>
                    {issue.duplicateOf && (
                      <div className="text-xs text-ink-muted">duplicate — tracked under the original</div>
                    )}
                  </td>
                  <td className="p-3">{issue.category}</td>
                  <td className="p-3">
                    <StatusPill status={issue.status} />
                  </td>
                  <td className={`p-3 ${PRIORITY_TEXT[issue.priority] || 'text-ink-muted'}`}>
                    {issue.priority || '—'}
                  </td>
                  <td className="p-3 text-ink-muted">{age(issue.createdAt)}</td>
                  <td className="p-3">{issue.supporterCount}</td>
                  <td className="p-3">
                    <div className="flex flex-col gap-2">
                      <AssignControls issue={issue} onSaved={replace} />
                      <button
                        onClick={() => setEditing(issue)}
                        className="self-start rounded border border-line px-2 py-1 text-xs"
                      >
                        Update status
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <StatusModal
          issue={editing}
          onClose={() => setEditing(null)}
          onSaved={replace}
        />
      )}
    </main>
  );
}

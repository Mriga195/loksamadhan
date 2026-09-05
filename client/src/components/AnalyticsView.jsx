import { useMemo } from 'react';
import Icon from './Icon';

const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Sewage',
  'Solid Waste Management',
  'Electricity & Lighting',
  'Public Health & Drainage',
  'General Administration',
];

export default function AnalyticsView({ issues = [] }) {
  // Department statistics
  const deptStats = useMemo(() => {
    return DEPARTMENTS.map(dept => {
      const deptIssues = issues.filter(i => i.department === dept);
      const total = deptIssues.length;
      const resolved = deptIssues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
      const inProgress = deptIssues.filter(i => i.status === 'In Progress' || i.status === 'Acknowledged').length;
      const pending = deptIssues.filter(i => i.status === 'Submitted').length;
      const overdue = deptIssues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed' && Date.now() - new Date(i.createdAt) > 7 * 86400000).length;
      const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

      return { dept, total, resolved, inProgress, pending, overdue, rate };
    });
  }, [issues]);

  // Priority distribution
  const priorityStats = useMemo(() => {
    const total = issues.length || 1;
    const high = issues.filter(i => i.priority === 'high').length;
    const medium = issues.filter(i => i.priority === 'medium').length;
    const low = issues.filter(i => i.priority === 'low').length;
    const unassigned = issues.filter(i => !i.priority).length;

    return {
      high, highPct: Math.round((high / total) * 100),
      medium, mediumPct: Math.round((medium / total) * 100),
      low, lowPct: Math.round((low / total) * 100),
      unassigned, unassignedPct: Math.round((unassigned / total) * 100),
    };
  }, [issues]);

  // Overall metrics
  const totalCount = issues.length;
  const resolvedCount = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
  const overallRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const overdueCount = issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed' && Date.now() - new Date(i.createdAt) > 7 * 86400000).length;

  return (
    <div className="space-y-6">
      {/* ── Top Summary Grid ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Resolution Rate</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600">
              <Icon name="check" className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-ink">{overallRate}%</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${overallRate}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">{resolvedCount} of {totalCount} total issues resolved</p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">SLA & Overdue Compliance</span>
            <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-rose-600">
              <Icon name="clock" className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-ink">{overdueCount}</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${totalCount > 0 ? Math.min(100, Math.round((overdueCount / totalCount) * 100)) : 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {overdueCount === 0 ? 'All issues within SLA target' : `${overdueCount} issue(s) open longer than 7 days`}
          </p>
        </div>

        <div className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between text-ink-muted">
            <span className="text-xs font-semibold uppercase tracking-wider">Priority Workload</span>
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
              <Icon name="chart" className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-ink">{priorityStats.high}</p>
          <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-line">
            <div className="bg-rose-500" style={{ width: `${priorityStats.highPct}%` }} title="High Priority" />
            <div className="bg-amber-500" style={{ width: `${priorityStats.mediumPct}%` }} title="Medium Priority" />
            <div className="bg-slate-400" style={{ width: `${priorityStats.lowPct}%` }} title="Low Priority" />
          </div>
          <p className="mt-2 text-xs text-ink-muted">{priorityStats.high} High • {priorityStats.medium} Medium • {priorityStats.low} Low</p>
        </div>
      </div>

      {/* ── Department Performance Matrix ── */}
      <section className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Department Performance Matrix</h2>
            <p className="text-xs text-ink-muted">Real-time breakdown of issue resolution efficiency across municipal departments.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <Icon name="activity" className="size-3.5" />
            {DEPARTMENTS.length} Active Departments
          </span>
        </div>

        <div className="mt-6 space-y-5">
          {deptStats.map(item => (
            <div key={item.dept} className="rounded-xl border border-line bg-canvas/40 p-4 transition-colors hover:bg-canvas">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-ink text-sm">{item.dept}</h3>
                  <p className="text-xs text-ink-muted">
                    {item.total} total issue{item.total === 1 ? '' : 's'} • {item.resolved} resolved • {item.inProgress} in progress • {item.pending} pending
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {item.overdue > 0 && (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      {item.overdue} Overdue
                    </span>
                  )}
                  <span className="font-bold text-sm text-ink tabular-nums">{item.rate}% Rate</span>
                </div>
              </div>

              <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${item.total > 0 ? (item.resolved / item.total) * 100 : 0}%` }}
                  title={`Resolved: ${item.resolved}`}
                />
                <div
                  className="bg-blue-500 transition-all duration-500"
                  style={{ width: `${item.total > 0 ? (item.inProgress / item.total) * 100 : 0}%` }}
                  title={`In Progress: ${item.inProgress}`}
                />
                <div
                  className="bg-amber-400 transition-all duration-500"
                  style={{ width: `${item.total > 0 ? (item.pending / item.total) * 100 : 0}%` }}
                  title={`Pending: ${item.pending}`}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

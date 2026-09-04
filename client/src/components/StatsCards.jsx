import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

// Admin-only summary above the queue. Consumes Lane 1's GET /api/stats.
// routes/stats.js is still a stub. Lane 1's planned shape is
//   { total, byStatus: {...}, byCategory: {...}, byDepartment: {...} }
// `unassigned` and `resolvedThisWeek` are extras we asked for — every field falls back to 0,
// so this renders correctly whichever subset lands.
//
// Plain divs with big numbers on purpose. An npm install for a bar chart nobody asked for is
// exactly the trade that costs the deploy window.

// Literal class strings. Tailwind scans source text, so `text-${tone}` would generate nothing.
const TONES = {
  ink: 'text-ink',
  progress: 'text-progress-600',
  resolved: 'text-resolved-600',
};

function Card({ label, value, tone = 'ink' }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-ink-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${TONES[tone]}`}>{value}</div>
    </div>
  );
}

export default function StatsCards() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/api/stats').then(setStats).catch(e => setError(e.message));
  }, []);

  if (error) return <p className="text-sm text-rejected-600">Could not load stats: {error}</p>;
  if (!stats) return <div className="h-24 animate-pulse rounded-card bg-line" />;

  const byStatus = stats.byStatus || {};
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Card label="Total" value={stats.total ?? 0} />
      <Card label="Open" value={(stats.total ?? 0) - (byStatus.Resolved ?? 0) - (byStatus.Rejected ?? 0)} />
      <Card label="Unassigned" value={stats.unassigned ?? 0} tone="progress" />
      <Card label="Resolved" value={byStatus.Resolved ?? 0} tone="resolved" />
      <Card label="Resolved this week" value={stats.resolvedThisWeek ?? 0} tone="resolved" />
    </section>
  );
}

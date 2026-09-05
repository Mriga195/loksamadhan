import { useEffect, useState } from 'react';
import { apiFetch } from '../api';

const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Sewage',
  'Solid Waste Management',
  'Electricity & Lighting',
  'Public Health & Drainage',
  'General Administration',
];

const select = 'rounded border border-line bg-surface px-2 py-1 text-xs disabled:opacity-50';

export default function AssignControls({ issue, onSaved }) {
  const [department, setDepartment] = useState(issue.department || '');
  const [officerId, setOfficerId] = useState(
    issue.assignedOfficer?._id || issue.assignedOfficer || ''
  );
  const [deptOfficers, setDeptOfficers] = useState([]);
  const [officerLoads, setOfficerLoads] = useState({}); // {officerId: activeCount}
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');

  // Fetch officers whenever department changes
  useEffect(() => {
    if (!department) {
      setDeptOfficers([]);
      setOfficerLoads({});
      return;
    }
    let active = true;
    setLoadingOfficers(true);
    apiFetch(`/api/issues/dept-officers?department=${encodeURIComponent(department)}`)
      .then(res => {
        if (active) setDeptOfficers(res.officers || []);
      })
      .catch(() => { if (active) setDeptOfficers([]); })
      .finally(() => { if (active) setLoadingOfficers(false); });
    return () => { active = false; };
  }, [department]);

  async function save(dept, offId) {
    setError(null);
    if (!dept) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/issues/${issue._id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          department: dept,
          officerId: offId || undefined,
          // No priority sent — server auto-determines
        }),
      });
      onSaved?.(updated);
      setSavedMsg('✓ Assigned');
      setTimeout(() => setSavedMsg(''), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Department selector */}
      <div className="flex gap-2 flex-wrap items-center">
        <select
          aria-label="Department"
          className={select}
          disabled={saving}
          value={department}
          onChange={e => {
            setDepartment(e.target.value);
            setOfficerId(''); // reset officer on dept change
          }}
        >
          <option value="">Select Department</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        {/* Officer selector — only shown if dept has multiple officers */}
        {deptOfficers.length > 1 && (
          <select
            aria-label="Assign Officer"
            className={select}
            disabled={saving || loadingOfficers}
            value={officerId}
            onChange={e => setOfficerId(e.target.value)}
          >
            <option value="">Auto (Load-Balanced)</option>
            {deptOfficers.map(o => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
        )}

        <button
          type="button"
          disabled={saving || !department}
          onClick={() => save(department, officerId)}
          className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Assign'}
        </button>
      </div>

      {/* Status messages */}
      {savedMsg && (
        <p className="text-[11px] font-semibold text-emerald-700">{savedMsg}</p>
      )}

      {/* Auto-allotment feedback */}
      {deptOfficers.length === 1 && (
        <p className="text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded flex items-center gap-1 border border-brand-200">
          ⚡ Auto-allots to <strong>{deptOfficers[0].name}</strong> (sole officer)
        </p>
      )}

      {deptOfficers.length > 1 && !officerId && (
        <p className="text-[11px] text-ink-muted">
          ⚖️ {deptOfficers.length} officers in dept — system will auto pick least-loaded officer.
        </p>
      )}

      {loadingOfficers && (
        <p className="text-[11px] text-ink-muted animate-pulse">Loading officers…</p>
      )}

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

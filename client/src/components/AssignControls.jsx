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
const PRIORITIES = ['low', 'medium', 'high'];

const select = 'rounded border border-line bg-surface px-2 py-1 text-xs disabled:opacity-50';

export default function AssignControls({ issue, onSaved }) {
  const [value, setValue] = useState({
    department: issue.department || '',
    priority: issue.priority || '',
    officerId: issue.assignedOfficer?._id || issue.assignedOfficer || '',
  });
  const [deptOfficers, setDeptOfficers] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch officers whenever department changes or on initial mount
  useEffect(() => {
    if (!value.department) {
      setDeptOfficers([]);
      return;
    }
    let active = true;
    setLoadingOfficers(true);
    apiFetch(`/api/issues/dept-officers?department=${encodeURIComponent(value.department)}`)
      .then(res => {
        if (active) setDeptOfficers(res.officers || []);
      })
      .catch(() => {
        if (active) setDeptOfficers([]);
      })
      .finally(() => {
        if (active) setLoadingOfficers(false);
      });
    return () => { active = false; };
  }, [value.department]);

  async function save(next) {
    const previous = value;
    setValue(next);
    setError(null);
    if (!next.department || !next.priority) return;

    setSaving(true);
    try {
      const updated = await apiFetch(`/api/issues/${issue._id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          department: next.department,
          priority: next.priority,
          officerId: next.officerId || undefined,
        }),
      });
      onSaved?.(updated);
    } catch (e) {
      setValue(previous);
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const singleOfficer = deptOfficers.length === 1 ? deptOfficers[0] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Department"
          className={select}
          disabled={saving}
          value={value.department}
          onChange={e => save({ ...value, department: e.target.value, officerId: '' })}
        >
          <option value="">Select Department</option>
          {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>

        <select
          aria-label="Priority"
          className={select}
          disabled={saving}
          value={value.priority}
          onChange={e => save({ ...value, priority: e.target.value })}
        >
          <option value="">Priority</option>
          {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* If multiple officers exist in this department, allow specific selection */}
        {deptOfficers.length > 1 && (
          <select
            aria-label="Assign Officer"
            className={select}
            disabled={saving}
            value={value.officerId}
            onChange={e => save({ ...value, officerId: e.target.value })}
          >
            <option value="">Dept Pool (Unassigned Officer)</option>
            {deptOfficers.map(o => (
              <option key={o._id} value={o._id}>{o.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Auto-allotment feedback */}
      {singleOfficer && (
        <p className="text-[11px] font-medium text-brand-700 bg-brand-50 px-2 py-0.5 rounded flex items-center gap-1 border border-brand-200">
          <span>⚡ Auto-allots to <strong>{singleOfficer.name}</strong> (sole officer)</span>
        </p>
      )}

      {deptOfficers.length > 1 && !value.officerId && (
        <p className="text-[11px] text-ink-muted">
          {deptOfficers.length} officers in dept. Select an officer or leave in department queue.
        </p>
      )}

      {error && <p className="text-xs text-rejected-600">{error}</p>}
    </div>
  );
}

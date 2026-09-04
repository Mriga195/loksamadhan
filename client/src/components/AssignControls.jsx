import { useState } from 'react';
import { apiFetch } from '../api';

// Two selects on a dashboard row: department and priority. Saves on change.
//
// Mirrored from server/constants.js. If Lane 1 adds a department, it changes in both places —
// that is the cost of not adding a constants endpoint, and it is cheaper than the endpoint.
const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Sewage',
  'Solid Waste Management',
  'Electricity & Lighting',
  'Public Health & Drainage',
  'General Administration',
];
const PRIORITIES = ['low', 'medium', 'high'];

const select = 'rounded border border-line bg-surface px-2 py-1 text-sm disabled:opacity-50';

export default function AssignControls({ issue, onSaved }) {
  const [value, setValue] = useState({
    department: issue.department || '',
    priority: issue.priority || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function save(next) {
    const previous = value;
    setValue(next);                       // optimistic — the row updates before the round trip
    setError(null);
    if (!next.department || !next.priority) return;   // server needs both; wait for the second pick

    setSaving(true);
    try {
      const updated = await apiFetch(`/api/issues/${issue._id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify(next),
      });
      onSaved?.(updated);
    } catch (e) {
      setValue(previous);                 // rollback, and show what the server actually said
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <select
          aria-label="Department"
          className={select}
          disabled={saving}
          value={value.department}
          onChange={e => save({ ...value, department: e.target.value })}
        >
          <option value="">Unassigned</option>
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
      </div>
      {error && <p className="text-xs text-rejected-600">{error}</p>}
    </div>
  );
}

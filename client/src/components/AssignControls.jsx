import { useEffect, useState, useMemo } from 'react';
import { apiFetch } from '../api';

const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Sewage',
  'Solid Waste Management',
  'Electricity & Lighting',
  'Public Health & Drainage',
  'General Administration',
];

const select = 'rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand-600 focus:outline-none disabled:opacity-50';

export default function AssignControls({ issue, onSaved }) {
  const [department, setDepartment] = useState(issue.department || '');
  const [region, setRegion] = useState(issue.region || '');
  const [officerId, setOfficerId] = useState(
    issue.assignedOfficer?._id || issue.assignedOfficer || ''
  );

  const [allDeptOfficers, setAllDeptOfficers] = useState([]);
  const [allRegions, setAllRegions] = useState([]);
  const [loadingOfficers, setLoadingOfficers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedMsg, setSavedMsg] = useState('');

  // Fetch all department officers and registered regions dynamically
  useEffect(() => {
    if (!department) {
      setAllDeptOfficers([]);
      return;
    }
    let active = true;
    setLoadingOfficers(true);
    apiFetch(`/api/issues/dept-officers?department=${encodeURIComponent(department)}`)
      .then(res => {
        if (active) {
          setAllDeptOfficers(res.allDeptOfficers || res.officers || []);
          if (res.allRegions && res.allRegions.length) {
            setAllRegions(res.allRegions);
          }
        }
      })
      .catch(() => { if (active) setAllDeptOfficers([]); })
      .finally(() => { if (active) setLoadingOfficers(false); });
    return () => { active = false; };
  }, [department]);

  // Keep state synchronized if issue prop updates
  useEffect(() => {
    if (issue.department) setDepartment(issue.department);
    if (issue.region) setRegion(issue.region);
    setOfficerId(issue.assignedOfficer?._id || issue.assignedOfficer || '');
  }, [issue._id, issue.department, issue.region, issue.assignedOfficer]);

  // Dynamic regions list: unique combination of server regions + current issue region
  const regionOptions = useMemo(() => {
    const list = new Set(['Tezpur', 'Jorhat', 'Jorhat West', 'Sivasagar', 'Guwahati', 'Dibrugarh', 'Nagaon']);
    allRegions.forEach(r => { if (r) list.add(r); });
    if (issue.region) list.add(issue.region);
    if (region) list.add(region);
    return Array.from(list);
  }, [allRegions, issue.region, region]);

  // Dynamically partition officers into matching region vs other regions
  const { matchingOfficers, otherOfficers } = useMemo(() => {
    if (!region) {
      return { matchingOfficers: allDeptOfficers, otherOfficers: [] };
    }
    const regLower = region.trim().toLowerCase();
    const matching = allDeptOfficers.filter(o => o.region && o.region.trim().toLowerCase() === regLower);
    const other = allDeptOfficers.filter(o => !o.region || o.region.trim().toLowerCase() !== regLower);
    return { matchingOfficers: matching, otherOfficers: other };
  }, [allDeptOfficers, region]);

  async function save(dept, reg, offId) {
    setError(null);
    if (!dept) return;
    setSaving(true);
    try {
      const updated = await apiFetch(`/api/issues/${issue._id}/assign`, {
        method: 'PATCH',
        body: JSON.stringify({
          department: dept,
          region: reg || undefined,
          officerId: offId || undefined,
        }),
      });
      onSaved?.(updated);
      setSavedMsg('✓ Triage saved');
      setTimeout(() => setSavedMsg(''), 2500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* 3 Dynamic Selectors: Department, Region, Officer */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* 1. Department */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-0.5">
            Department
          </label>
          <select
            aria-label="Department"
            className={`w-full ${select}`}
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
        </div>

        {/* 2. Region / District */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-0.5">
            Region / District
          </label>
          <select
            aria-label="Region"
            className={`w-full ${select}`}
            disabled={saving}
            value={region}
            onChange={e => {
              setRegion(e.target.value);
              setOfficerId(''); // reset officer when region changes to recalculate regional auto-assignment
            }}
          >
            <option value="">Select Region</option>
            {regionOptions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* 3. Officer */}
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-0.5">
            Assigned Officer
          </label>
          <select
            aria-label="Assign Officer"
            className={`w-full ${select}`}
            disabled={saving || loadingOfficers || !department}
            value={officerId}
            onChange={e => setOfficerId(e.target.value)}
          >
            <option value="">
              Auto (Load-Balanced: {region || 'General'})
            </option>

            {matchingOfficers.length > 0 && (
              <optgroup label={`Officers in ${region || 'All Zones'}`}>
                {matchingOfficers.map(o => (
                  <option key={o._id} value={o._id}>
                    {o.name} {o.region ? `(${o.region})` : ''}
                  </option>
                ))}
              </optgroup>
            )}

            {otherOfficers.length > 0 && (
              <optgroup label="Officers in Other Regions">
                {otherOfficers.map(o => (
                  <option key={o._id} value={o._id}>
                    {o.name} {o.region ? `(${o.region})` : '(No Region)'}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Action Button & Feedback */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <div className="flex-1 text-[11px]">
          {savedMsg ? (
            <p className="font-semibold text-emerald-700">{savedMsg}</p>
          ) : loadingOfficers ? (
            <p className="text-ink-muted animate-pulse">Loading regional officers…</p>
          ) : matchingOfficers.length === 0 && region && department ? (
            <p className="text-amber-700 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
              ⚠️ No officer in {region} for this dept. Auto-assign routes to Admin Triage.
            </p>
          ) : matchingOfficers.length > 1 && !officerId ? (
            <p className="text-brand-700 font-medium bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
              👥 {matchingOfficers.length} officers in {region} — system auto-balances by active workload.
            </p>
          ) : matchingOfficers.length === 1 && !officerId ? (
            <p className="text-ink-muted">
              Auto-allots to <strong>{matchingOfficers[0].name}</strong> ({region}).
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={saving || !department}
          onClick={() => save(department, region, officerId)}
          className="cursor-pointer shrink-0 rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Saving…' : 'Assign'}
        </button>
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../AuthContext';
import { apiFetch } from '../api';
import Avatar from './Avatar';
import Icon from './Icon';
import Spinner, { Skeleton } from './Spinner';

const DEPARTMENTS = [
  'Roads & Infrastructure',
  'Water Supply & Sewage',
  'Solid Waste Management',
  'Electricity & Lighting',
  'Public Health & Drainage',
  'General Administration',
];

const REGIONS = [
  'Tezpur',
  'Jorhat',
  'Jorhat West',
  'Sivasagar',
  'Guwahati',
  'Dibrugarh',
  'Nagaon',
  'Silchar',
  'Tinsukia',
  'Bongaigaon',
  'Golaghat',
  'Barpeta',
  'Dhubri',
];

export default function OfficeUsersManager({ currentUser }) {
  const { updateUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create, user obj = edit
  const [deleteModalUser, setDeleteModalUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isCustomRegion, setIsCustomRegion] = useState(false);

  // Dynamic unique list of all regions (preset list + any regions from existing users)
  const allRegionOptions = useMemo(() => {
    const set = new Set(REGIONS);
    users.forEach(u => {
      if (u.region && typeof u.region === 'string' && u.region.trim()) {
        set.add(u.region.trim());
      }
    });
    return Array.from(set);
  }, [users]);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'officer',
    department: DEPARTMENTS[0],
    region: 'Tezpur',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/admin/users');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch office users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingUser(null);
    setShowPassword(false);
    setIsCustomRegion(false);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'officer',
      department: DEPARTMENTS[0],
      region: 'Tezpur',
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setShowPassword(false);
    const existingRegion = user.region || 'Tezpur';
    setIsCustomRegion(!allRegionOptions.includes(existingRegion) && !!existingRegion);
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'officer',
      department: user.department || DEPARTMENTS[0],
      region: existingRegion,
    });
    setFormError(null);
    setModalOpen(true);
  };

  // Submit Create or Edit
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError(null);

    try {
      if (editingUser) {
        // Edit existing user
        const isAdmin = editingUser.role === 'admin';
        const payload = {
          name: formData.name.trim(),
        };

        if (isAdmin) {
          // For admin: only name and password can be changed
          if (formData.password && formData.password.trim()) {
            payload.password = formData.password.trim();
          }
        } else {
          // For officer: email, role, department, region, and password can be changed
          payload.email = formData.email.trim();
          payload.role = formData.role;
          payload.department = formData.role === 'officer' ? formData.department : null;
          payload.region = formData.role === 'officer' ? (formData.region?.trim() || null) : null;
          if (formData.password && formData.password.trim()) {
            payload.password = formData.password.trim();
          }
        }

        const res = await apiFetch(`/api/admin/users/${editingUser._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        // If the logged-in user changed their own name/profile, sync immediately with global auth context
        const isSelf = String(editingUser._id) === String(currentUser?._id);
        if (isSelf && updateUser && res.user) {
          updateUser(res.user);
        }

        // Update list
        setUsers(prev => prev.map(u => (u._id === editingUser._id ? { ...u, ...res.user, workStats: res.user.role === 'admin' ? null : u.workStats } : u)));
        setModalOpen(false);
        setSuccessMsg(res.message || 'Office user updated successfully');
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchUsers(); // refresh list
      } else {
        // Create new user
        const payload = {
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password.trim(),
          role: formData.role,
          department: formData.role === 'officer' ? formData.department : null,
          region: formData.role === 'officer' ? (formData.region?.trim() || null) : null,
        };

        const res = await apiFetch('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (res.user) {
          setUsers(prev => [res.user, ...prev]);
        }
        setModalOpen(false);
        setSuccessMsg(res.message || 'New office user created successfully');
        setTimeout(() => setSuccessMsg(null), 4000);
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.message || 'Action failed');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Delete user
  const handleDeleteUser = async () => {
    if (!deleteModalUser) return;
    setFormSubmitting(true);
    try {
      await apiFetch(`/api/admin/users/${deleteModalUser._id}`, {
        method: 'DELETE',
      });
      setUsers(prev => prev.filter(u => u._id !== deleteModalUser._id));
      setDeleteModalUser(null);
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setFormSubmitting(false);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const q = search.toLowerCase();
      const matchesSearch = !search || user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesDept = !deptFilter || user.department === deptFilter;
      const matchesRegion = !regionFilter || (user.region && user.region.toLowerCase() === regionFilter.toLowerCase());
      return matchesSearch && matchesRole && matchesDept && matchesRegion;
    });
  }, [users, search, roleFilter, deptFilter, regionFilter]);

  // Overall metrics summary
  const summaryStats = useMemo(() => {
    const totalStaff = users.length;
    const officers = users.filter(u => u.role === 'officer').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const officerUsers = users.filter(u => u.role === 'officer' && u.workStats);
    const totalWorkRatios = officerUsers.reduce((acc, u) => acc + (u.workStats?.workRatio || 0), 0);
    const avgWorkRatio = officerUsers.length > 0 ? Math.round(totalWorkRatios / officerUsers.length) : 0;

    return { totalStaff, officers, admins, avgWorkRatio };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Office User Management</h2>
          <p className="text-sm text-ink-muted">Manage staff accounts, assign operational regions/districts, and track performance work ratios.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 shadow-sm"
        >
          <Icon name="userPlus" className="size-4" />
          Create Office User
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <Icon name="check" className="size-5 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-card border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-brand-50 p-2.5 text-brand-600">
              <Icon name="users" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Total Office Users</p>
              <p className="text-2xl font-bold text-ink">{summaryStats.totalStaff}</p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Icon name="building" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Officers</p>
              <p className="text-2xl font-bold text-ink">{summaryStats.officers}</p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
              <Icon name="shield" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Admins</p>
              <p className="text-2xl font-bold text-ink">{summaryStats.admins}</p>
            </div>
          </div>
        </div>

        <div className="rounded-card border border-line bg-surface p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
              <Icon name="chart" className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">Avg Work Ratio</p>
              <p className="text-2xl font-bold text-ink">{summaryStats.avgWorkRatio}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface py-2 pl-3 pr-8 text-sm focus:border-brand-600 focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-ink-muted hover:text-ink"
            >
              <Icon name="close" className="size-4" />
            </button>
          )}
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="officer">Officer</option>
          <option value="admin">Admin</option>
        </select>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        >
          <option value="">All Departments</option>
          {DEPARTMENTS.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={regionFilter}
          onChange={(e) => setRegionFilter(e.target.value)}
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
        >
          <option value="">All Regions</option>
          {allRegionOptions.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {(search || roleFilter || deptFilter || regionFilter) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); setDeptFilter(''); setRegionFilter(''); }}
            className="text-xs text-brand-600 hover:underline"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Error state */}
      {error && (
        <p className="rounded-card border border-rejected-600/30 bg-rejected-50 p-4 text-sm text-rejected-600">
          Error: {error}
        </p>
      )}

      {/* Users Table */}
      <div className="rounded-card border border-line bg-surface overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8">
            <Skeleton count={4} className="h-12 w-full mb-3" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-ink-muted">
            <Icon name="users" className="mx-auto size-8 text-ink-muted/50 mb-2" />
            <p className="font-medium text-ink">No office users found</p>
            <p className="text-xs mt-1">Try adjusting your filters or create a new office user.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/50 text-xs uppercase tracking-wide text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">User Profile</th>
                  <th scope="col" className="px-4 py-3 font-medium">Role</th>
                  <th scope="col" className="px-4 py-3 font-medium">Department</th>
                  <th scope="col" className="px-4 py-3 font-medium">Work Ratio & Performance</th>
                  <th scope="col" className="px-4 py-3 font-medium">Resolved / Actioned</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredUsers.map((u) => {
                  const stats = u.workStats || {};
                  const isSelf = String(u._id) === String(currentUser?._id);
                  const ratio = stats.workRatio ?? 0;

                  // Color gradient for work ratio bar
                  let ratioColorClass = 'bg-emerald-500';
                  let ratioBgClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  if (ratio < 40) {
                    ratioColorClass = 'bg-amber-500';
                    ratioBgClass = 'bg-amber-50 text-amber-700 border-amber-200';
                  }
                  if (stats.actionedCount === 0 && stats.deptTotal === 0) {
                    ratioColorClass = 'bg-slate-400';
                    ratioBgClass = 'bg-slate-100 text-slate-600 border-slate-200';
                  }

                  return (
                    <tr key={u._id} className="transition-colors hover:bg-canvas/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} />
                          <div>
                            <p className="font-semibold text-ink leading-tight flex items-center gap-2">
                              {u.name}
                              {isSelf && (
                                <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-700">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-ink-muted">{u.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          <Icon name={u.role === 'admin' ? 'shield' : 'building'} className="size-3" />
                          {u.role}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-ink-muted">
                        <span className="font-medium text-ink">
                          {u.department || 'General Administration'}
                        </span>
                        {u.role === 'officer' && (
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                              <Icon name="map" className="size-3 text-brand-600" />
                              {u.region ? `${u.region} Zone` : 'All Regions'}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 min-w-[180px]">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-ink-muted">—</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-medium">
                              <span className="text-ink-muted">Work Ratio</span>
                              <span className={`rounded border px-1.5 py-0.5 font-bold ${ratioBgClass}`}>
                                {ratio}%
                              </span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-line">
                              <div
                                className={`h-full transition-all duration-500 ${ratioColorClass}`}
                                style={{ width: `${Math.min(100, Math.max(0, ratio))}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-muted">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-ink-muted">—</span>
                        ) : (
                          <>
                            <p className="font-medium text-ink">
                              <span className="text-emerald-600 font-bold">{stats.resolvedByCount ?? 0}</span> resolved /{' '}
                              <span className="font-semibold">{stats.actionedCount ?? 0}</span> actioned
                            </p>
                            <p className="text-[11px] text-ink-muted mt-0.5">
                              Dept Total: {stats.deptTotal ?? 0} ({stats.deptResolved ?? 0} resolved)
                            </p>
                          </>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="cursor-pointer rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-canvas hover:text-brand-600"
                            title="Edit user"
                          >
                            <Icon name="pencil" className="size-4" />
                          </button>

                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteModalUser(u)}
                            className={`cursor-pointer rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-rejected-50 hover:text-rejected-600 ${
                              isSelf ? 'opacity-30 cursor-not-allowed' : ''
                            }`}
                            title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                          >
                            <Icon name="trash" className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="text-lg font-bold text-ink">
                {editingUser ? (editingUser.role === 'admin' ? 'Edit Admin' : 'Edit Office User') : 'Create Office User'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="cursor-pointer rounded-lg p-1 text-ink-muted hover:bg-canvas hover:text-ink"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            {formError && (
              <p className="mt-4 rounded-lg bg-rejected-50 p-3 text-xs font-medium text-rejected-600 border border-rejected-200">
                {formError}
              </p>
            )}

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted mb-1">
                  Full Name <span className="text-rejected-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Chandra"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
                    Email Address {editingUser?.role === 'admin' ? <span className="text-ink-muted text-[10px] font-normal normal-case">(cannot be changed)</span> : <span className="text-rejected-600">*</span>}
                  </label>
                  {editingUser?.role === 'admin' && (
                    <span className="text-[10px] text-ink-muted font-medium">Read-only</span>
                  )}
                </div>
                <input
                  type="email"
                  disabled={editingUser?.role === 'admin'}
                  required
                  placeholder="e.g. officer@loksamadhan.gov.in"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none ${
                    editingUser?.role === 'admin'
                      ? 'bg-canvas/70 text-ink-muted cursor-not-allowed select-none'
                      : 'bg-surface focus:border-brand-600'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted">
                    Password {editingUser ? <span className="text-ink-muted text-[10px] font-normal normal-case">(leave blank to keep unchanged)</span> : <span className="text-rejected-600">*</span>}
                  </label>
                  {editingUser && formData.password && (
                    <span className={`text-[10px] font-medium ${formData.password.length < 6 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {formData.password.length < 6 ? 'Min 6 characters' : 'New password ready'}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required={!editingUser}
                    minLength={formData.password ? 6 : undefined}
                    placeholder={editingUser ? 'Enter new password to change' : 'At least 6 characters'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-line bg-surface px-3 py-2 pr-10 text-sm focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink cursor-pointer p-1"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'eyeOff' : 'eye'} className="size-4" />
                  </button>
                </div>
                {editingUser && (
                  <p className="mt-1 text-[11px] text-ink-muted">
                    {editingUser.role === 'admin'
                      ? 'Admins can update their name and password anytime. Leave blank to keep current password.'
                      : 'Leave blank to keep current password.'}
                  </p>
                )}
              </div>

              {editingUser?.role === 'admin' ? (
                <div className="flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50/60 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-md bg-purple-100 p-1.5 text-purple-700">
                      <Icon name="shield" className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-purple-950">Role: Administrator</p>
                      <p className="text-[10px] text-purple-700">Admins can only change their name and password</p>
                    </div>
                  </div>
                  <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                    Admin
                  </span>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted mb-1">
                        Role <span className="text-rejected-600">*</span>
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
                      >
                        <option value="officer">Officer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    {formData.role === 'officer' && (
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted mb-1">
                          Department <span className="text-rejected-600">*</span>
                        </label>
                        <select
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
                        >
                          {DEPARTMENTS.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {formData.role === 'officer' && (
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wider text-ink-muted mb-1">
                        Assigned Region / District <span className="text-rejected-600">*</span>
                      </label>
                      <select
                        required
                        value={isCustomRegion ? '__custom__' : (formData.region || '')}
                        onChange={(e) => {
                          if (e.target.value === '__custom__') {
                            setIsCustomRegion(true);
                            setFormData(prev => ({ ...prev, region: '' }));
                          } else {
                            setIsCustomRegion(false);
                            setFormData(prev => ({ ...prev, region: e.target.value }));
                          }
                        }}
                        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-brand-600 focus:outline-none cursor-pointer"
                      >
                        <option value="" disabled>Select assigned region / district...</option>
                        {allRegionOptions.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                        <option value="__custom__">+ Other (Enter Custom District / Zone)...</option>
                      </select>

                      {isCustomRegion && (
                        <div className="mt-2">
                          <input
                            type="text"
                            required
                            placeholder="Type custom region / district name (e.g. Silchar, Golaghat...)"
                            value={formData.region}
                            onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-brand-600 focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}

                      <p className="mt-1 text-[11px] text-ink-muted">
                        New civic issues filed in this region/district will be auto-assigned to this officer.
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-9 cursor-pointer rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
                >
                  {formSubmitting && <Spinner className="size-4" />}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-ink">Confirm Delete</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Are you sure you want to delete office user <strong className="text-ink">{deleteModalUser.name}</strong> ({deleteModalUser.email})?
            </p>
            <p className="mt-1 text-xs text-rejected-600 font-medium">
              This action is permanent and cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteModalUser(null)}
                className="min-h-9 cursor-pointer rounded-lg border border-line px-4 text-sm font-medium text-ink hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={formSubmitting}
                onClick={handleDeleteUser}
                className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-rejected-600 px-4 text-sm font-medium text-white transition-colors hover:bg-rejected-700 disabled:opacity-50"
              >
                {formSubmitting && <Spinner className="size-4" />}
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

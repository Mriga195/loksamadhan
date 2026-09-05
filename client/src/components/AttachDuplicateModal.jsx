import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import Icon from './Icon';
import Spinner from './Spinner';
import StatusPill from './StatusPill';
import { shortId } from './IssueDrawer';

export default function AttachDuplicateModal({
  issue, // The issue being attached to a parent
  isOpen,
  onClose,
  onAttached, // Callback when successfully attached
}) {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(true); // default: filter by same category
  const [selectedParentId, setSelectedParentId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Reset state whenever modal opens or closes or issue changes
  useEffect(() => {
    setSubmitting(false);
    setError(null);
    setSelectedParentId(null);
    setSearch('');

    if (!isOpen || !issue?._id) return;

    setLoading(true);
    setFilterCategory(true);

    apiFetch('/api/issues?duplicates=exclude&limit=150')
      .then((res) => {
        const list = res.items || [];
        // Filter out the current issue itself and any resolved/closed issues
        const valid = list.filter(
          (item) =>
            item._id !== issue._id &&
            item.status !== 'Resolved' &&
            item.status !== 'Closed'
        );
        setCandidates(valid);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load candidate issues');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, issue?._id]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, submitting, onClose]);

  // Filtered issues based on search and category filter
  const filteredCandidates = useMemo(() => {
    return candidates.filter((item) => {
      if (filterCategory && item.category !== issue?.category) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const sId = shortId(item).toLowerCase();
      const title = (item.title || '').toLowerCase();
      const addr = (item.address || item.area || '').toLowerCase();
      const dept = (item.department || '').toLowerCase();
      return (
        sId.includes(q) ||
        title.includes(q) ||
        addr.includes(q) ||
        dept.includes(q)
      );
    });
  }, [candidates, filterCategory, issue?.category, search]);

  const handleAttach = async () => {
    if (!selectedParentId || !issue?._id || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const updated = await apiFetch(`/api/issues/${issue._id}/duplicate`, {
        method: 'PATCH',
        body: JSON.stringify({ duplicateOfId: selectedParentId }),
      });
      setSubmitting(false);
      onAttached?.(updated);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to attach issue');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedTarget = candidates.find((c) => c._id === selectedParentId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attach-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-4 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="flex h-[88vh] max-h-[700px] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-line bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-lg bg-brand-100 text-brand-700">
                  <Icon name="link" className="size-4" />
                </span>
                <h2 id="attach-modal-title" className="text-lg font-bold text-slate-900">
                  Attach as Similar Report
                </h2>
              </div>
              <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                Choose an original report to link with{' '}
                <span className="font-semibold text-slate-900">#{shortId(issue)}</span> (
                <span className="italic">"{issue.title}"</span>). It will be managed under that report.
              </p>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
            >
              <Icon name="close" className="size-5" />
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, ID, location, or department…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setFilterCategory(true)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  filterCategory
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Same Category ({issue.category})
              </button>
              <button
                type="button"
                onClick={() => setFilterCategory(false)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  !filterCategory
                    ? 'bg-brand-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Open Reports
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-rose-50 border-b border-rose-200 px-4 py-2 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Issue Candidate List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50/30">
          {loading ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Spinner label="Loading reports…" />
              <span>Loading candidate reports…</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 text-center p-6 text-slate-500">
              <Icon name="search" className="size-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No candidate reports found</p>
              <p className="text-xs text-slate-500 max-w-sm">
                {filterCategory
                  ? `No other open reports in "${issue.category}". Try switching to "All Open Reports" above.`
                  : 'No open reports match your search query.'}
              </p>
            </div>
          ) : (
            filteredCandidates.map((item) => {
              const isSelected = selectedParentId === item._id;
              return (
                <div
                  key={item._id}
                  onClick={() => setSelectedParentId(item._id)}
                  className={`group relative flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-all ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/40 shadow-sm ring-2 ring-brand-500/20'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50/60'
                  }`}
                >
                  {/* Radio Indicator */}
                  <div className="mt-0.5 shrink-0">
                    <span
                      className={`grid size-4 place-items-center rounded-full border transition ${
                        isSelected
                          ? 'border-brand-600 bg-brand-600 text-white'
                          : 'border-slate-300 bg-white group-hover:border-slate-400'
                      }`}
                    >
                      {isSelected && <span className="size-1.5 rounded-full bg-white" />}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-semibold text-brand-600">
                          #{shortId(item)}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.category}
                        </span>
                        {item.department && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 truncate max-w-[150px]">
                            {item.department}
                          </span>
                        )}
                      </div>
                      <StatusPill status={item.status} size="sm" />
                    </div>

                    <h4 className="mt-1 text-xs font-semibold text-slate-900 leading-snug">
                      {item.title}
                    </h4>

                    {(item.address || item.area) && (
                      <p className="mt-0.5 text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <Icon name="map" className="size-3 text-slate-400 shrink-0" />
                        {item.address || item.area}
                      </p>
                    )}

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-1">
                      <span>Reported {new Date(item.createdAt).toLocaleDateString()}</span>
                      {item.supporterCount > 0 && (
                        <span>+{item.supporterCount} citizen supporters</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface p-4">
          <div className="text-xs text-slate-600">
            {selectedTarget ? (
              <span>
                Selected target:{' '}
                <strong className="text-slate-900 font-semibold">
                  #{shortId(selectedTarget)} — {selectedTarget.title}
                </strong>
              </span>
            ) : (
              <span>Select an original report above to attach</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedParentId || submitting}
              onClick={handleAttach}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Spinner label="Linking" />
                  <span>Linking…</span>
                </>
              ) : (
                <>
                  <Icon name="link" className="size-3.5" />
                  <span>Attach to Selected Report</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

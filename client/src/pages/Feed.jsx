import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api';
import IssueCard from '../components/IssueCard';
import FilterBar from '../components/FilterBar';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { Skeleton } from '../components/Spinner';

// The public landing page. No token required - the API's GET /api/issues is auth(false), so
// this must render for a logged-out visitor. Verify in a private window before the demo.
//
// Filter state lives in the URL via useSearchParams, so a filtered view is a shareable link and
// the back button steps through filter changes. No cache layer and no client-side sort: the
// server owns paging and ordering, and there are 15-50 issues.
// ponytail: refetches the whole page on filter change. Fine at this size.

const PAGE_SIZE = 20;
const KEYS = ['category', 'status', 'department', 'q'];

export default function Feed() {
  const [params, setParams] = useSearchParams();
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const filters = Object.fromEntries(KEYS.map(k => [k, params.get(k) || '']));
  const query = KEYS.map(k => filters[k]).join(' ');   // one stable dep for the effect

  const fetchPage = useCallback(async (wanted) => {
    const qs = new URLSearchParams({ page: String(wanted), limit: String(PAGE_SIZE) });
    for (const k of KEYS) if (params.get(k)) qs.set(k, params.get(k));

    const data = await apiFetch(`/api/issues?${qs}`);
    setTotal(data.total);
    setPage(wanted);
    setIssues(prev => (wanted === 1 ? data.items : [...prev, ...data.items]));
  }, [params]);

  // Filters changed (or first load) - reset to page 1.
  useEffect(() => {
    let stale = false;
    setLoading(true);
    setError(null);
    fetchPage(1)
      .catch(e => { if (!stale) setError(e.message); })
      .finally(() => { if (!stale) setLoading(false); });
    // A slow response for the old filters must not overwrite results for the new ones.
    return () => { stale = true; };
  }, [query]);   // eslint-disable-line react-hooks/exhaustive-deps

  const onChange = (key, val) => {
    const next = new URLSearchParams(params);
    if (val) next.set(key, val); else next.delete(key);
    setParams(next, { replace: true });
  };
  const onClear = () => setParams(new URLSearchParams(), { replace: true });

  const loadMore = async () => {
    setLoadingMore(true);
    try { await fetchPage(page + 1); }
    catch (e) { setError(e.message); }
    finally { setLoadingMore(false); }
  };

  const hasFilters = KEYS.some(k => filters[k]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-semibold">Reported issues</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Every report filed in your area, and exactly where each one has got to.
      </p>

      <div className="mt-5">
        <FilterBar value={filters} onChange={onChange} onClear={onClear} />
      </div>

      <div className="mt-5">
        {loading && <Skeleton count={4} className="h-28" />}

        {!loading && error && <ErrorState message={error} onRetry={() => fetchPage(1)} />}

        {!loading && !error && issues.length === 0 && (
          <EmptyState
            title={hasFilters ? 'No reports match these filters' : 'No reports yet'}
            hint={hasFilters
              ? 'Try a broader search, or clear the filters to see everything.'
              : 'When someone files the first report, it will appear here.'}
            actionLabel={hasFilters ? 'Clear filters' : undefined}
            onAction={hasFilters ? onClear : undefined}
          />
        )}

        {!loading && !error && issues.length > 0 && (
          <>
            <p className="mb-3 text-sm text-ink-muted">
              {total} {total === 1 ? 'report' : 'reports'}
            </p>
            <ul className="space-y-3">
              {issues.map(i => <IssueCard key={i._id} issue={i} />)}
            </ul>

            {/* A button, not infinite scroll: less code, and it does not break the back button. */}
            {issues.length < total && (
              <button type="button" onClick={loadMore} disabled={loadingMore}
                className="mt-4 min-h-11 w-full cursor-pointer rounded-lg border border-line
                  bg-surface text-sm font-medium transition-colors duration-200 hover:bg-canvas
                  disabled:opacity-60">
                {loadingMore ? 'Loading...' : `Load more (${total - issues.length} left)`}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}

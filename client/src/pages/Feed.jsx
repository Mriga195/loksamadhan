import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useLang } from '../LangContext';
import IssueCard from '../components/IssueCard';
import FilterBar from '../components/FilterBar';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { Skeleton } from '../components/Spinner';
import FeedMap from '../components/FeedMap';
import StatsCards from '../components/StatsCards';

// The public landing page. No token required - the API's GET /api/issues is auth(false), so
// this must render for a logged-out visitor. Verify in a private window before the demo.
//
// Filter state lives in the URL via useSearchParams, so a filtered view is a shareable link and
// the back button steps through filter changes. No cache layer and no client-side sort: the
// server owns paging and ordering, and there are 15-50 issues.
// ponytail: refetches the whole page on filter change. Fine at this size.

const PAGE_SIZE = 10;
const KEYS = ['category', 'status', 'department', 'q'];

const EN = {
  heading: 'Reported issues',
  showingOf: (shown, total) => `Showing 1–${shown} of ${total} issues`,
  showMore: 'Show more',
  loading: 'Loading…',
  noMatchTitle: 'No reports match these filters',
  noMatchHint: 'Try a broader search, or clear the filters to see everything.',
  noReportsTitle: 'No reports yet',
  noReportsHint: 'When someone files the first report, it will appear here.',
  clearFilters: 'Clear filters',
};

export default function Feed() {
  const [params, setParams] = useSearchParams();
  const { lang, translate } = useLang();
  const [issues, setIssues] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [t, setT] = useState(EN);

  // Translate static strings (not `showingOf` — that's a function, computed inline)
  useEffect(() => {
    if (lang === 'en') { setT(EN); return; }
    const keys = ['showMore', 'loading', 'noMatchTitle', 'noMatchHint', 'noReportsTitle', 'noReportsHint', 'clearFilters', 'heading'];
    const vals = keys.map(k => (typeof EN[k] === 'string' ? EN[k] : ''));
    translate(vals).then((translated) => {
      setT(prev => ({
        ...prev,
        ...Object.fromEntries(keys.map((k, i) => [k, translated[i] || prev[k]])),
      }));
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* The filter bar and the numbered map are the page's title in the design; the heading is
          kept for screen readers and the document outline. */}
      <h1 className="sr-only">Reported issues</h1>
      <h1 className="sr-only">{t.heading}</h1>

      <StatsCards />

      <FilterBar value={filters} onChange={onChange} onClear={onClear} />

      {/* List left, map right. One column below lg — a 400px-tall map above a list of five
          cards is worse than no map on a phone, so it is simply not rendered there. */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          {loading && <Skeleton count={4} className="h-28" />}

          {!loading && error && <ErrorState message={error} onRetry={() => fetchPage(1)} />}

          {!loading && !error && issues.length === 0 && (
            <EmptyState
              title={hasFilters ? 'No reports match these filters' : 'No reports yet'}
              hint={hasFilters
                ? 'Try a broader search, or clear the filters to see everything.'
                : 'When someone files the first report, it will appear here.'}
              actionLabel={hasFilters ? 'Clear filters' : undefined}
              title={hasFilters ? t.noMatchTitle : t.noReportsTitle}
              hint={hasFilters ? t.noMatchHint : t.noReportsHint}
              actionLabel={hasFilters ? t.clearFilters : undefined}
              onAction={hasFilters ? onClear : undefined}
            />
          )}

          {!loading && !error && issues.length > 0 && (
            <>
              <div className="space-y-4">
                {issues.map((i, idx) => <IssueCard key={i._id} issue={i} index={idx + 1} />)}
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl
                border border-line bg-surface px-5 py-3 text-sm text-ink-muted">
                <span>Showing 1&ndash;{issues.length} of {total} issues</span>

                {/* A button, not infinite scroll: less code, and it does not break the back
                    button. */}
                {issues.length < total && (
                  <button type="button" onClick={loadMore} disabled={loadingMore}
                    className="inline-flex cursor-pointer items-center gap-1.5 font-medium
                      text-brand-600 hover:text-brand-700 disabled:opacity-60 transition-colors">
                    {loadingMore ? 'Loading…' : 'Show more'}
                    {loadingMore ? t.loading : t.showMore}
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        {/* sticky: the map stays beside the list as it scrolls, which is the only reason to
            show both at once. */}
        <div className="hidden lg:block">
          <div className="sticky top-6 h-[calc(100vh-6rem)] overflow-hidden rounded-card
            border border-line bg-surface">
            <FeedMap issues={issues} />
          </div>
        </div>
      </div>
    </main>
  );
}

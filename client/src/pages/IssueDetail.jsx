import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import FeedMap from '../components/FeedMap';
import Icon from '../components/Icon';
import StatusPill from '../components/StatusPill';
import StatusTimeline from '../components/StatusTimeline';
import ErrorState from '../components/ErrorState';
import Spinner, { Skeleton } from '../components/Spinner';
import { timeAgo } from '../components/IssueCard';
import NotFound from './NotFound';

// Public. This is where a citizen finds out whether anyone did anything, so it has to read as
// an answer, not a record.
//
// Two columns on desktop: the report itself on the left, and what happened to it on the right
// (Progress + the "me too" action), pinned while the photos scroll. The right column is the
// answer to "did anything happen", so it should not be below the fold.

const card = 'rounded-2xl border border-line bg-surface';

function Field({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className="mt-0.5 size-[18px] shrink-0 text-ink-muted" />
      <div className="min-w-0">
        <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
        <dd className="mt-0.5 truncate text-sm">{children}</dd>
      </div>
    </div>
  );
}

export default function IssueDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [issue, setIssue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [supporting, setSupporting] = useState(false);
  const [visibleDuplicates, setVisibleDuplicates] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      setIssue(await apiFetch(`/api/issues/${id}`));
    } catch (e) {
      // A bad or deleted id renders the 404 page. A blank white screen mid-demo reads as
      // "the site is broken"; 400 lands here too, since a malformed id is equally "no such page".
      if (e.status === 404 || e.status === 400) setNotFound(true);
      else setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load, user?._id]);

  const isMine = Boolean(issue?.isReporter || (user && issue?.reporter?._id && String(issue.reporter._id) === String(user._id)));

  async function support() {
    // Logged out: send them to log in and come back to this page.
    if (!user) return navigate('/login', { state: { from: `/issues/${id}` } });

    const before = issue;
    // Optimistic: the count moves the instant they click, and rolls back if the server refuses
    // (supporting your own report is a 400).
    setIssue({ ...issue, supporterCount: issue.supporterCount + 1, hasSupported: true });
    setSupporting(true);
    try {
      const res = await apiFetch(`/api/issues/${id}/support`, { method: 'POST' });
      setIssue(prev => ({ ...prev, supporterCount: res.supporterCount, hasSupported: res.hasSupported }));
    } catch (e) {
      setIssue(before);
      setError(e.message);
    } finally {
      setSupporting(false);
    }
  }

  if (notFound) {
    return <NotFound title="That report does not exist"
      hint="The link may be wrong, or the report may have been removed." />;
  }
  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Skeleton count={2} className="h-56" />
          <Skeleton count={2} className="h-40" />
        </div>
      </main>
    );
  }
  if (error && !issue) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-8">
        <ErrorState message={error} onRetry={load} />
      </main>
    );
  }

  const photos = issue.photos ?? [];
  const hasMap = Array.isArray(issue.location?.coordinates) && issue.location.coordinates.length === 2;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/feed"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:underline">
        <Icon name="left" className="size-4" />
        All reports
      </Link>

      {/* If this report is a duplicate child, that is the FIRST thing on the page. It is the
          answer to "why has nothing happened on mine", and it demonstrates hard rule 1 on
          screen: nothing was deleted, it was linked. */}
      {issue.duplicateOf && issue.parent && (
        <div className="mt-4 rounded-2xl border border-acknowledged-600/30 bg-acknowledged-50 p-4">
          <p className="text-sm font-medium">
            This report is linked to an earlier report of the same issue.
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            It is being tracked under the original, which is currently{' '}
            <StatusPill status={issue.parent.status} /> .
          </p>
          <Link to={`/issues/${issue.parent._id}`}
            className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
            View the original report &rarr;
          </Link>
        </div>
      )}

      <div className="mt-5 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        {/* ── The report itself ── */}
        <div className="space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={issue.status} size="md" />
              <span className="rounded-full bg-canvas px-2.5 py-1 text-sm text-ink-muted">
                {issue.category}
              </span>
              {isMine && (
                <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700 border border-brand-200">
                  Submitted by you
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold leading-tight sm:text-[1.75rem]">{issue.title}</h1>
            <p className="mt-3 text-ink-muted">{issue.description}</p>
          </header>

          <dl className={`grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4 ${card}`}>
            <Field icon="users" label="Department">
              {issue.department || <span className="text-ink-muted">Not yet assigned</span>}
            </Field>
            <Field icon="sliders" label="Priority">
              {issue.priority || <span className="text-ink-muted">Not set</span>}
            </Field>
            <Field icon="clock" label="Reported">
              <time dateTime={issue.createdAt} title={new Date(issue.createdAt).toLocaleString()}>
                {timeAgo(issue.createdAt)}
              </time>
            </Field>
            <Field icon="map" label="Location">{issue.area || issue.address || 'Not given'}</Field>
          </dl>

          {(photos.length > 0 || hasMap) && (
            <div className={`grid items-start gap-6 ${photos.length > 0 && hasMap ? 'md:grid-cols-2' : ''}`}>
              {photos.length > 0 && (
                <section className={`p-5 ${card}`}>
                  <h2 className="font-semibold">
                    Images <span className="font-normal text-ink-muted">({photos.length})</span>
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Photos help us understand the issue better.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {photos.map(src => (
                      <a key={src} href={src} target="_blank" rel="noreferrer"
                        className="group relative block aspect-square overflow-hidden rounded-xl border border-line">
                        <img src={src} alt={`Photo of: ${issue.title}`} loading="lazy"
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        <span aria-hidden="true"
                          className="absolute bottom-1.5 right-1.5 grid size-7 place-items-center rounded-full bg-surface/90 text-ink-muted shadow-sm">
                          <Icon name="zoom" className="size-4" />
                        </span>
                      </a>
                    ))}
                  </div>
                </section>
              )}

              {hasMap && (
                <section className={`p-5 ${card}`}>
                  <h2 className="font-semibold">Location</h2>
                  <p className="mt-1 truncate text-sm text-ink-muted">
                    {issue.address || issue.area || 'Pinned location'}
                  </p>
                  <div className="mt-4 h-56 overflow-hidden rounded-xl border border-line">
                    <FeedMap issues={[issue]} numbered={false} />
                  </div>
                </section>
              )}
            </div>
          )}

          {issue.linkedDuplicates?.length > 0 && (
            <section className={`p-5 ${card}`}>
              <h2 className="font-semibold">
                Also reported by {issue.linkedDuplicates.length}{' '}
                {issue.linkedDuplicates.length === 1 ? 'citizen' : 'citizens'}
              </h2>
              <ul className="mt-2 divide-y divide-line">
                {issue.linkedDuplicates.slice(0, visibleDuplicates).map(d => (
                  <li key={d._id}>
                    <Link to={`/issues/${d._id}`}
                      className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-brand-600">
                      <span className="truncate">{d.title}</span>
                      <time dateTime={d.createdAt} className="shrink-0 text-xs text-ink-muted">
                        {timeAgo(d.createdAt)}
                      </time>
                    </Link>
                  </li>
                ))}
              </ul>
              {visibleDuplicates < issue.linkedDuplicates.length && (
                <div className="mt-3 pt-2 border-t border-line flex justify-end">
                  <button
                    type="button"
                    onClick={() => setVisibleDuplicates(prev => prev + 10)}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Show more
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ── What happened to it ── */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <section className={`p-5 ${card}`}>
            <h2 className="font-semibold">Progress</h2>
            <p className="mb-4 mt-1 text-sm text-ink-muted">
              Every status change is recorded and never edited.
            </p>
            <StatusTimeline history={issue.statusHistory} />
          </section>

          <section className={`p-5 ${card}`}>
            <h2 className="font-semibold">Affected by this too?</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {issue.supporterCount === 0
                ? 'Nobody else has reported this yet.'
                : `${issue.supporterCount} ${issue.supporterCount === 1 ? 'person has' : 'people have'} said this affects them.`}
            </p>

            {error && issue && (
              <p role="alert"
                className="mt-3 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
                {error}
              </p>
            )}

            <button type="button" onClick={support} disabled={issue.hasSupported || supporting}
              className="mt-4 inline-flex min-h-11 w-full cursor-pointer items-center justify-center
                gap-2 rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors
                duration-200 hover:bg-brand-700 disabled:cursor-default disabled:bg-resolved-600
                disabled:opacity-100">
              {supporting && <Spinner label="Saving" />}
              {issue.hasSupported ? 'You reported this too' : 'I have this problem too'}
            </button>
          </section>
        </aside>
      </div>
    </main>
  );
}

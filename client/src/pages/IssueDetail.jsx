import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiFetch } from '../api';
import { useAuth } from '../AuthContext';
import StatusPill from '../components/StatusPill';
import StatusTimeline from '../components/StatusTimeline';
import ErrorState from '../components/ErrorState';
import Spinner, { Skeleton } from '../components/Spinner';
import { timeAgo } from '../components/IssueCard';
import NotFound from './NotFound';

// Public. This is where a citizen finds out whether anyone did anything, so it has to read as
// an answer, not a record.

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
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

  useEffect(() => { load(); }, [load]);

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
      <main className="mx-auto max-w-3xl px-4 py-6">
        <Skeleton count={3} className="h-32" />
      </main>
    );
  }
  if (error && !issue) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6">
        <ErrorState message={error} onRetry={load} />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/feed" className="text-sm text-brand-600 hover:underline">&larr; All reports</Link>

      {/* If this report is a duplicate child, that is the FIRST thing on the page. It is the
          answer to "why has nothing happened on mine", and it demonstrates hard rule 1 on
          screen: nothing was deleted, it was linked. */}
      {issue.duplicateOf && issue.parent && (
        <div className="mt-4 rounded-card border border-acknowledged-600/30 bg-acknowledged-50 p-4">
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

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={issue.status} size="md" />
          <span className="text-sm text-ink-muted">{issue.category}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{issue.title}</h1>
        <p className="mt-2 text-ink-muted">{issue.description}</p>

        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-card border border-line bg-surface p-4 sm:grid-cols-4">
          <Field label="Department">
            {issue.department || <span className="text-ink-muted">Not yet assigned</span>}
          </Field>
          <Field label="Priority">
            {issue.priority || <span className="text-ink-muted">Not set</span>}
          </Field>
          <Field label="Reported">
            <time dateTime={issue.createdAt} title={new Date(issue.createdAt).toLocaleString()}>
              {timeAgo(issue.createdAt)}
            </time>
          </Field>
          <Field label="Location">{issue.area || issue.address || 'Not given'}</Field>
        </dl>
      </header>

      {issue.photos?.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-medium text-ink-muted">Photos</h2>
          <div className="mt-2 flex flex-wrap gap-3">
            {issue.photos.map(src => (
              // Opens full size in a new tab. No lightbox library for a demo with three photos.
              <a key={src} href={src} target="_blank" rel="noreferrer"
                className="overflow-hidden rounded-lg border border-line">
                <img src={src} alt={`Photo of: ${issue.title}`} loading="lazy"
                  className="h-32 w-auto object-cover" />
              </a>
            ))}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Progress</h2>
        <p className="mb-4 mt-0.5 text-xs text-ink-muted">
          Every status change is recorded and never edited.
        </p>
        <StatusTimeline history={issue.statusHistory} />
      </section>

      {issue.linkedDuplicates?.length > 0 && (
        <section className="mt-6 rounded-card border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">
            Also reported by {issue.linkedDuplicates.length}{' '}
            {issue.linkedDuplicates.length === 1 ? 'citizen' : 'citizens'}
          </h2>
          <ul className="mt-3 divide-y divide-line">
            {issue.linkedDuplicates.map(d => (
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
        </section>
      )}

      <section className="mt-6 rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">Affected by this too?</h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          {issue.supporterCount === 0
            ? 'Nobody else has reported this yet.'
            : `${issue.supporterCount} ${issue.supporterCount === 1 ? 'person has' : 'people have'} said this affects them.`}
        </p>

        {error && issue && (
          <p role="alert" className="mt-3 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
            {error}
          </p>
        )}

        <button type="button" onClick={support} disabled={issue.hasSupported || supporting}
          className="mt-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg
            bg-brand-600 px-4 text-sm font-medium text-white transition-colors duration-200
            hover:bg-brand-700 disabled:cursor-default disabled:bg-resolved-600 disabled:opacity-100">
          {supporting && <Spinner label="Saving" />}
          {issue.hasSupported ? 'You reported this too' : 'I have this problem too'}
        </button>
      </section>
    </main>
  );
}

import { Link } from 'react-router-dom';

// Covers both an unknown route and a bad or deleted issue id — IssueDetail renders this on a
// 404 rather than a blank screen. A white page mid-demo reads as "the site is down".
export default function NotFound({
  title = 'That page does not exist',
  hint = 'The link may be wrong, or the report may have been removed.',
}) {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-3xl font-semibold text-ink-muted">404</p>
      <h1 className="mt-2 text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">{hint}</p>
      <Link to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 text-sm
          font-medium text-white transition-colors duration-200 hover:bg-brand-700">
        Back to all reports
      </Link>
    </main>
  );
}

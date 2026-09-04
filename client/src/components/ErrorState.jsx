// Shown when a request failed. Distinct from EmptyState — this one implies something is wrong
// and offers a way to try again.
//
// `message` is the server's `{ error }` string, rendered verbatim: api.js already turns a non-2xx
// body into that message. Do not translate it into "Something went wrong" — the server writes
// copy the citizen can act on ("A resolution note or evidence is required"), and replacing it
// with a generic line throws away the only useful information on the screen.
//
// role="alert" so a screen reader announces the failure without the user hunting for it.

export default function ErrorState({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="rounded-card border border-rejected-600/30 bg-rejected-50 px-6 py-8 text-center"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mx-auto size-8 text-rejected-600"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M12 9v3.75m0 3.75h.008M10.34 3.94l-8.1 14.02A1.5 1.5 0 0 0 3.54 20.2h16.92a1.5 1.5 0 0 0 1.3-2.24l-8.1-14.02a1.5 1.5 0 0 0-2.6 0Z" />
      </svg>

      <p className="mt-3 text-base font-medium">That didn’t load</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
        {message || 'Check your connection and try again.'}
      </p>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 min-h-11 cursor-pointer rounded-lg border border-line bg-surface px-4
            text-sm font-medium transition-colors duration-200 hover:bg-canvas"
        >
          Try again
        </button>
      )}
    </div>
  );
}

// Shown when a request succeeded but there is nothing to show. Distinct from ErrorState:
// "nothing matched" is a normal outcome, not a failure, and the copy must not read like one.
//
// The action is the point. A blank panel that says "No data" tells a citizen nothing about what
// to do next — every empty state here takes a way out (clear the filters, report the issue).

export default function EmptyState({ title, hint, actionLabel, onAction }) {
  return (
    <div className="rounded-card border border-dashed border-line bg-surface px-6 py-12 text-center">
      {/* Decorative — the heading below already carries the meaning. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="mx-auto size-10 text-ink-muted/50"
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
      </svg>

      <p className="mt-4 text-base font-medium">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">{hint}</p>}

      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 min-h-11 cursor-pointer rounded-lg bg-brand-600 px-4 text-sm
            font-medium text-white transition-colors duration-200 hover:bg-brand-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

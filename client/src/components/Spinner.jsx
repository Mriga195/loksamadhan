// Shared loading primitives. Lanes 2 and 4 import these — do not hand-roll another spinner.
//
// Two shapes, because they solve different problems:
//   <Spinner />   — an inline busy indicator for buttons and small regions.
//   <Skeleton />  — a block that reserves the space the content will occupy, so the page does
//                   not jump when it arrives. Prefer this for lists and cards.
//
// Both respect prefers-reduced-motion via `motion-reduce:animate-none`: a spinner that cannot
// animate still reads as "busy" through its aria-label, so nothing is lost.

export default function Spinner({ label = 'Loading', className = '' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current
        border-t-transparent align-[-0.125em] motion-reduce:animate-none ${className}`}
    />
  );
}

// `count` renders repeated rows so a list skeleton matches the shape of the list it replaces.
export function Skeleton({ className = '', count = 1 }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-3">
      <span className="sr-only">Loading…</span>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`animate-pulse rounded-card bg-line motion-reduce:animate-none ${className}`}
        />
      ))}
    </div>
  );
}

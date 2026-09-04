// The signed-in user chip, shared by the public nav and the dashboard top bar so the two cannot
// drift apart. Initials, not a photo: this build has no avatar upload, and a coloured circle
// beats a broken image.
export default function Avatar({ name, className = 'size-9 text-sm' }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');

  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full
      bg-brand-600 font-semibold text-white ${className}`}>
      {initials}
    </span>
  );
}

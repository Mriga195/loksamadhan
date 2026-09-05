import { useState } from 'react';

// The signed-in user chip, shared by the public nav and the dashboard top bar.
// Displays the user's avatar image if available, falling back to name initials.
export default function Avatar({ name, src, className = 'size-9 text-sm' }) {
  const [imgError, setImgError] = useState(false);
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2)
    .map(w => w[0].toUpperCase()).join('');

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={name || 'Avatar'}
        onError={() => setImgError(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full
      bg-brand-600 font-semibold text-white ${className}`}>
      {initials}
    </span>
  );
}

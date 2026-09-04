// The shield-and-people mark: civic protection (shield) + citizens (three figures), the two
// ideas behind the name. One inline SVG, no icon-font glyph exists for this.
export default function Logo({ className = 'size-9' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path fill="#2563eb" d="M12 2 4 5v6c0 5 3.4 8.7 8 11 4.6-2.3 8-6 8-11V5l-8-3Z" />
      <circle cx="12" cy="9.5" r="1.6" fill="#fff" />
      <circle cx="8.4" cy="11" r="1.3" fill="#93c5fd" />
      <circle cx="15.6" cy="11" r="1.3" fill="#93c5fd" />
      <path fill="#fff"
        d="M12 11.4c-1.4 0-2.6 1-2.6 2.4v1h5.2v-1c0-1.4-1.2-2.4-2.6-2.4Z" />
      <path fill="#93c5fd"
        d="M8.4 12.6c-1.15 0-2.1.85-2.1 2v.9h2.9v-.7c0-.8.25-1.55.7-2.1a2.3 2.3 0 0 0-1.5-.1Zm7.2 0a2.3 2.3 0 0 0-1.5.1c.45.55.7 1.3.7 2.1v.7h2.9v-.9c0-1.15-.95-2-2.1-2Z" />
    </svg>
  );
}

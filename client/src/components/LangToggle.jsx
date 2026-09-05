import { useLang } from '../LangContext';

// Toggle button between English and Assamese.
// Shows EN or অ (Assamese abbreviation for "অসমীয়া").
// Shows a subtle spinner when a translation batch is in flight.
// Styled to match the `outline` pill used elsewhere in the nav.

export default function LangToggle() {
  const { lang, setLang, loading } = useLang();
  const isAs = lang === 'as';

  return (
    <button
      type="button"
      onClick={() => setLang(isAs ? 'en' : 'as')}
      aria-label={isAs ? 'Switch to English' : 'অসমীয়ালৈ সলনি কৰক'}
      title={isAs ? 'Switch to English' : 'Switch to Assamese'}
      className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-canvas hover:border-slate-300 select-none cursor-pointer"
    >
      {loading ? (
        <svg className="size-4 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.75" className="size-[16px] shrink-0 text-ink-muted">
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3.5 9h17M3.5 15h17M12 3c-2.5 3-4 5.5-4 9s1.5 6 4 9M12 3c2.5 3 4 5.5 4 9s-1.5 6-4 9" />
        </svg>
      )}
      <span>{isAs ? 'EN' : 'অ'}</span>
    </button>
  );
}

// One input look for every form in the app, taken from the mobile app's fields: a white
// rounded slab with a violet-tinted shadow rather than a hairline box. Labels add their own
// `mt-1` — the class carries no outer spacing, so it drops into a card or a label alike.
export const field = 'w-full min-h-13 rounded-lg border border-line bg-surface px-4 text-base' +
  ' shadow-sm focus:border-brand-600';

// The filled violet action. Same radius and weight as the app's "Log In" / "Report a New Issue".
export const primaryBtn = 'flex min-h-13 cursor-pointer items-center justify-center gap-2' +
  ' rounded-lg bg-brand-600 px-6 text-base font-semibold text-white shadow-sm' +
  ' transition-colors hover:bg-brand-700 disabled:opacity-60';

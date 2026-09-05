import { useState } from 'react';
import Icon from './Icon';
import { field } from '../formStyles';

// Split-panel shell shared by /login and /register: pitch on the left, form on the right.
//
// Below md the left panel collapses — a phone should not scroll past three feature tiles to
// reach the password box. But collapsing it entirely left the form with no identity at all, so
// the icon/heading/blurb come back as a compact banner and only the tile list is dropped.
//
// The card also goes edge-to-edge below sm: a rounded border with gutters costs ~32px of a
// 360px screen to draw a box around the only thing on the page.

const TONES = {
  brand: { panel: 'bg-brand-50', badge: 'bg-brand-100 text-brand-600', tile: 'bg-brand-100 text-brand-600' },
  green: { panel: 'bg-resolved-50', badge: 'bg-resolved-50 text-resolved-600', tile: 'bg-resolved-50 text-resolved-600' },
};

export default function AuthShell({ tone = 'brand', icon, heading, blurb, points, children }) {
  const t = TONES[tone];
  return (
    <main className="mx-auto max-w-7xl sm:px-4 sm:py-10">
      <div className="grid overflow-hidden border-line bg-surface
        sm:rounded-card sm:border md:min-h-[38rem] md:grid-cols-2">
        <div className={`flex items-center gap-4 px-5 py-6 md:hidden ${t.panel}`}>
          <span className={`flex size-12 shrink-0 items-center justify-center rounded-full ${t.badge}`}>
            <Icon name={icon} className="size-6" />
          </span>
          <span>
            <span className="block font-semibold">{heading}</span>
            <span className="mt-0.5 block text-sm text-ink-muted">{blurb}</span>
          </span>
        </div>

        <aside className={`hidden flex-col justify-center p-10 md:flex ${t.panel}`}>
          <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${t.badge}`}>
            <Icon name={icon} className="size-8" />
          </div>
          <h2 className="mt-5 text-center text-lg font-semibold">{heading}</h2>
          <p className="mt-2 text-center text-sm text-ink-muted">{blurb}</p>

          <ul className="mt-8 space-y-5 border-t border-line pt-8">
            {points.map(p => (
              <li key={p.title} className="flex gap-3">
                <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${t.tile}`}>
                  <Icon name={p.icon} className="size-[18px]" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{p.title}</span>
                  <span className="block text-xs text-ink-muted">{p.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </aside>

        <div className="flex flex-col justify-center p-5 sm:p-6 md:p-10">{children}</div>
      </div>
    </main>
  );
}

// Same input, plus a reveal toggle. The toggle is a real button so it is reachable by keyboard.
export function PasswordField({ label, hint, hintError, className = 'mt-4', ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <>
      <label className={`${className} block text-sm font-medium`}>
        {label}
        <span className="relative block">
          <input type={shown ? 'text' : 'password'} required className={`${field} mt-1 pr-11`} {...props} />
          <button
            type="button"
            onClick={() => setShown(!shown)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            className="absolute right-0 top-1 flex size-10 cursor-pointer items-center
              justify-center text-ink-muted hover:text-ink"
          >
            <Icon name={shown ? 'eyeOff' : 'eye'} className="size-[18px]" />
          </button>
        </span>
      </label>
      {hint && (
        <p id={props['aria-describedby']} className={`mt-1 text-xs ${hintError ? 'text-rejected-600' : 'text-ink-muted'}`}>
          {hint}
        </p>
      )}
    </>
  );
}

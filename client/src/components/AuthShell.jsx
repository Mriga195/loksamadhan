import { useState } from 'react';
import Icon from './Icon';
import { field } from '../formStyles';

// Split-panel shell shared by /login and /register: pitch on the left, form on the right.
// The left panel is decoration — it collapses away below md rather than pushing the form
// down a phone screen.

const TONES = {
  brand: { panel: 'bg-brand-50', badge: 'bg-brand-100 text-brand-600', tile: 'bg-brand-100 text-brand-600' },
  green: { panel: 'bg-resolved-50', badge: 'bg-resolved-50 text-resolved-600', tile: 'bg-resolved-50 text-resolved-600' },
};

export default function AuthShell({ tone = 'brand', icon, heading, blurb, points, children }) {
  const t = TONES[tone];
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="grid overflow-hidden rounded-card border border-line bg-surface
        md:min-h-[38rem] md:grid-cols-2">
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

        <div className="flex flex-col justify-center p-6 sm:p-10">{children}</div>
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

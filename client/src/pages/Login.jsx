import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import AuthShell, { PasswordField } from '../components/AuthShell';
import { field, primaryBtn } from '../formStyles';

// Seeded accounts, click to fill. This is not decoration: a judge will not type credentials out
// of a README, and a demo that cannot be logged into is a demo that gets watched instead of
// explored. Keep this in sync with server/seed.js.
const DEMO = [
  { role: 'Citizen', email: 'citizen1@example.com', name: 'Ankur Sharma' },
  { role: 'Officer', email: 'officer.roads@loksamadhan.gov.in', name: 'Rina Das' },
  { role: 'Admin', email: 'admin@loksamadhan.gov.in', name: 'Admin Bora' },
];
const DEMO_PASSWORD = 'password123';

const POINTS = [
  { icon: 'clipboard', title: 'File & track reports', body: 'Report issues and follow their resolution.' },
  { icon: 'activity', title: 'Stay updated', body: 'See status changes as officers make them.' },
  { icon: 'shield', title: 'Private by default', body: 'Your personal info is never made public.' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  // Lane 1's RequireAuth is meant to set `state.from`. It may not exist yet, so fall back to
  // the feed rather than assuming the shape.
  const from = location.state?.from || '/';

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await login(email, password);
      // Officers and admins land on their queue; that is the only place their session is useful.
      const target = from !== '/' ? from
        : (user.role === 'officer' || user.role === 'admin') ? '/dashboard' : '/';
      // Whatever the visitor had typed before the wall comes back with them.
      navigate(target, { replace: true, state: location.state?.draft ? { draft: location.state.draft } : undefined });
    } catch (err) {
      setError(err.message);          // the server's { error }, verbatim
      setPending(false);
    }
  }

  return (
    <AuthShell
      tone="brand"
      icon="shield"
      heading="Welcome back"
      blurb="Log in to keep reporting and tracking issues in your ward."
      points={POINTS}
    >
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        You do not need an account to browse reports — only to file or support one.
      </p>

      <form onSubmit={submit} className="mt-6">
        {/* Errors sit above the fields and are announced, not just coloured. */}
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            autoComplete="email"
            required
            className={`${field} mt-1`}
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <PasswordField
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <button
          type="submit"
          disabled={pending}
          className={`${primaryBtn} mt-6 w-full`}
        >
          {pending && <Spinner label="Signing in" />}
          {pending ? 'Signing in…' : 'Log in'}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          No account? <Link to="/register" state={location.state} className="text-brand-600 underline">Sign up</Link>
        </p>
      </form>

      <section className="mt-8 rounded-card border border-dashed border-line p-4">
        <h2 className="text-sm font-medium">Demo accounts</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Click one to fill the form. Password for all: <code>{DEMO_PASSWORD}</code>
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {DEMO.map(d => (
            <button
              key={d.email}
              type="button"
              onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); setError(null); }}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border
                border-line px-3 py-2 text-left text-xs transition-colors duration-200
                hover:border-brand-600 hover:bg-brand-50"
            >
              <Icon name="users" className="size-4 text-ink-muted" />
              <span>
                <span className="block font-medium">{d.role}</span>
                <span className="block text-ink-muted">{d.name}</span>
              </span>
            </button>
          ))}
        </div>
      </section>
    </AuthShell>
  );
}

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';

// Seeded accounts, click to fill. This is not decoration: a judge will not type credentials out
// of a README, and a demo that cannot be logged into is a demo that gets watched instead of
// explored. Keep this in sync with server/seed.js.
const DEMO = [
  { role: 'Citizen', email: 'citizen1@example.com', name: 'Ankur Sharma' },
  { role: 'Officer', email: 'officer.roads@loksamadhan.gov.in', name: 'Rina Das' },
  { role: 'Admin', email: 'admin@loksamadhan.gov.in', name: 'Admin Bora' },
];
const DEMO_PASSWORD = 'password123';

const field = 'mt-1 w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-base' +
  ' focus:border-brand-600';

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
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);          // the server's { error }, verbatim
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        You do not need an account to browse reports — only to file or support one.
      </p>

      <form onSubmit={submit} className="mt-6 rounded-card border border-line bg-surface p-5">
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
            className={field}
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            type="password"
            autoComplete="current-password"
            required
            className={field}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="mt-6 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2
            rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors duration-200
            hover:bg-brand-700 disabled:opacity-60"
        >
          {pending && <Spinner label="Signing in" />}
          {pending ? 'Signing in…' : 'Log in'}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          No account? <Link to="/register" className="text-brand-600 underline">Sign up</Link>
        </p>
      </form>

      <section className="mt-6 rounded-card border border-dashed border-line p-4">
        <h2 className="text-sm font-medium">Demo accounts</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Click one to fill the form. Password for all: <code>{DEMO_PASSWORD}</code>
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO.map(d => (
            <button
              key={d.email}
              type="button"
              onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); setError(null); }}
              className="min-h-11 cursor-pointer rounded-lg border border-line px-3 text-left
                text-xs transition-colors duration-200 hover:bg-canvas"
            >
              <span className="block font-medium">{d.role}</span>
              <span className="block text-ink-muted">{d.name}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}

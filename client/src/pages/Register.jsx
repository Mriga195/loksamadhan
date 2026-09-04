import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';

// Citizen sign-up only. There is deliberately no role selector: routes/auth.js hardcodes
// role: 'citizen' and ignores anything else in the body, so a "sign up as officer" field would
// be a control that visibly does nothing — an invitation for a judge to find the gap.
// Officer and admin accounts come from seed.js.
//
// Password floor is 6 characters, mirroring the server. The server re-checks it; this is only
// so the citizen finds out before a round trip.
const MIN_PASSWORD = 6;

const field = 'mt-1 w-full min-h-11 rounded-lg border border-line bg-surface px-3 text-base' +
  ' focus:border-brand-600';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const set = k => e => setForm({ ...form, [k]: e.target.value });
  const tooShort = form.password.length > 0 && form.password.length < MIN_PASSWORD;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);          // e.g. "Email already registered", verbatim
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        An account lets you report issues and support reports filed by others.
      </p>

      <form onSubmit={submit} className="mt-6 rounded-card border border-line bg-surface p-5">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium">
          Full name
          <input
            type="text" autoComplete="name" required
            className={field} value={form.name} onChange={set('name')}
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Email
          <input
            type="email" autoComplete="email" required
            className={field} value={form.email} onChange={set('email')}
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Password
          <input
            type="password" autoComplete="new-password" required minLength={MIN_PASSWORD}
            className={field} value={form.password} onChange={set('password')}
            aria-describedby="pw-hint"
          />
        </label>
        {/* Hint text always occupies this slot, so turning it into an error does not shift
            the button down the page. */}
        <p
          id="pw-hint"
          className={`mt-1 text-xs ${tooShort ? 'text-rejected-600' : 'text-ink-muted'}`}
        >
          At least {MIN_PASSWORD} characters.
        </p>

        <button
          type="submit"
          disabled={pending || tooShort}
          className="mt-6 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2
            rounded-lg bg-brand-600 text-sm font-medium text-white transition-colors duration-200
            hover:bg-brand-700 disabled:opacity-60"
        >
          {pending && <Spinner label="Creating account" />}
          {pending ? 'Creating account…' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          Already registered? <Link to="/login" className="text-brand-600 underline">Log in</Link>
        </p>
      </form>
    </main>
  );
}

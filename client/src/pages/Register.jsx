import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Spinner from '../components/Spinner';
import AuthShell, { PasswordField } from '../components/AuthShell';
import { field, primaryBtn } from '../formStyles';

// Citizen sign-up only. There is deliberately no role selector: routes/auth.js hardcodes
// role: 'citizen' and ignores anything else in the body, so a "sign up as officer" field would
// be a control that visibly does nothing — an invitation for a judge to find the gap.
// Officer and admin accounts come from seed.js.
//
// Password floor is 6 characters, mirroring the server. The server re-checks it; this is only
// so the citizen finds out before a round trip.
const MIN_PASSWORD = 6;

const POINTS = [
  { icon: 'sparkles', title: 'Make a difference', body: 'Your reports help improve public services.' },
  { icon: 'chart', title: 'Track progress', body: 'Stay informed about the status of your reports.' },
  { icon: 'shield', title: 'Secure & private', body: 'We protect your information and respect your privacy.' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Arrives when someone bounced off the report form and chose to sign up instead of log in.
  const from = location.state?.from || '/';
  const draft = location.state?.draft;

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
      navigate(from, { replace: true, state: draft ? { draft } : undefined });
    } catch (err) {
      setError(err.message);          // e.g. "Email already registered", verbatim
      setPending(false);
    }
  }

  return (
    <AuthShell
      tone="green"
      icon="userPlus"
      heading="Create an account"
      blurb="Join LokSamadhan and help build a better, safer community."
      points={POINTS}
    >
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <p className="mt-1 text-sm text-ink-muted">
        An account lets you report issues and support reports filed by others.
      </p>

      <form onSubmit={submit} className="mt-6">
        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
            {error}
          </p>
        )}

        <label className="block text-sm font-medium">
          Full name
          <input
            type="text" autoComplete="name" required
            className={`${field} mt-1`} value={form.name} onChange={set('name')}
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          Email
          <input
            type="email" autoComplete="email" required
            className={`${field} mt-1`} value={form.email} onChange={set('email')}
          />
        </label>

        {/* Hint text always occupies its slot, so turning it into an error does not shift
            the button down the page. */}
        <PasswordField
          label="Password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD}
          value={form.password}
          onChange={set('password')}
          aria-describedby="pw-hint"
          hint={`At least ${MIN_PASSWORD} characters.`}
          hintError={tooShort}
        />

        <button
          type="submit"
          disabled={pending || tooShort}
          className={`${primaryBtn} mt-6 w-full`}
        >
          {pending && <Spinner label="Creating account" />}
          {pending ? 'Creating account…' : 'Sign up'}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          Already registered? <Link to="/login" state={location.state} className="text-brand-600 underline">Log in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

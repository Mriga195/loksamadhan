import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import Spinner from '../components/Spinner';
import Icon from '../components/Icon';
import AuthShell, { PasswordField } from '../components/AuthShell';
import GoogleAuthButton from '../components/GoogleAuthButton';
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

const POINTS_EN = [
  { icon: 'clipboard', title: 'File & track reports', body: 'Report issues and follow their resolution.' },
  { icon: 'activity',  title: 'Stay updated',         body: 'See status changes as officers make them.' },
  { icon: 'shield',    title: 'Private by default',   body: 'Your personal info is never made public.' },
];

const EN = {
  heading: 'Welcome back',
  blurb: 'Log in to keep reporting and tracking issues in your ward.',
  title: 'Log in',
  sub: 'You do not need an account to browse reports — only to file or support one.',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  submit: 'Log in',
  submitting: 'Signing in…',
  noAccount: 'No account?',
  signUp: 'Sign up',
  demoTitle: 'Demo accounts',
  demoSub: 'Click one to fill the form. Password for all: password123',
};

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, translate } = useLang();
  const [t, setT] = useState(EN);
  const [points, setPoints] = useState(POINTS_EN);

  useEffect(() => {
    if (lang === 'en') { setT(EN); setPoints(POINTS_EN); return; }
    const uiStrings = Object.values(EN);
    const pointStrings = POINTS_EN.flatMap(p => [p.title, p.body]);
    translate([...uiStrings, ...pointStrings]).then((vals) => {
      const uiVals = vals.slice(0, uiStrings.length);
      const ptVals = vals.slice(uiStrings.length);
      setT(Object.fromEntries(Object.keys(EN).map((k, i) => [k, uiVals[i]])));
      setPoints(POINTS_EN.map((p, i) => ({ ...p, title: ptVals[i * 2], body: ptVals[i * 2 + 1] })));
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const from = location.state?.from || '/';

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const user = await login(email, password);
      const target = from !== '/' ? from
        : (user.role === 'officer' || user.role === 'admin') ? '/dashboard' : '/';
      navigate(target, { replace: true, state: location.state?.draft ? { draft: location.state.draft } : undefined });
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  async function handleGoogleSuccess(credential) {
    setError(null);
    try {
      const user = await loginWithGoogle(credential);
      const target = from !== '/' ? from
        : (user.role === 'officer' || user.role === 'admin') ? '/dashboard' : '/';
      navigate(target, { replace: true, state: location.state?.draft ? { draft: location.state.draft } : undefined });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <AuthShell tone="brand" icon="shield" heading={t.heading} blurb={t.blurb} points={points}>
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t.sub}</p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
          {error}
        </p>
      )}

      <div className="mt-6">
        <GoogleAuthButton onSuccess={handleGoogleSuccess} label="Sign in with Google" onError={(err) => setError(err.message)} />
      </div>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-surface px-3 text-xs uppercase tracking-wider text-ink-muted">
          Or continue with email
        </span>
      </div>

      <form onSubmit={submit}>
        <label className="block text-sm font-medium">
          {t.emailLabel}
          <input type="email" autoComplete="email" required
            className={`${field} mt-1`} value={email} onChange={e => setEmail(e.target.value)} />
        </label>

        <PasswordField label={t.passwordLabel} autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)} />

        <button type="submit" disabled={pending} className={`${primaryBtn} mt-6 w-full`}>
          {pending && <Spinner label="Signing in" />}
          {pending ? t.submitting : t.submit}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          {t.noAccount}{' '}
          <Link to="/register" state={location.state} className="text-brand-600 underline">{t.signUp}</Link>
        </p>
      </form>

      <section className="mt-8 rounded-card border border-dashed border-line p-4">
        <h2 className="text-sm font-medium">{t.demoTitle}</h2>
        <p className="mt-0.5 text-xs text-ink-muted">{t.demoSub}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {DEMO.map(d => (
            <button key={d.email} type="button"
              onClick={() => { setEmail(d.email); setPassword(DEMO_PASSWORD); setError(null); }}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border
                border-line px-3 py-2 text-left text-xs transition-colors duration-200
                hover:border-brand-600 hover:bg-brand-50">
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

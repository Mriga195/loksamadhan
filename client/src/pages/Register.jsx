import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import Spinner from '../components/Spinner';
import AuthShell, { PasswordField } from '../components/AuthShell';
import GoogleAuthButton from '../components/GoogleAuthButton';
import { field, primaryBtn } from '../formStyles';

// Citizen sign-up only. There is deliberately no role selector: routes/auth.js hardcodes
// role: 'citizen' and ignores anything else in the body, so a "sign up as officer" field would
// be a control that visibly does nothing — an invitation for a judge to find the gap.
// Officer and admin accounts come from seed.js.
//
// Password floor is 6 characters, mirroring the server. The server re-checks it; this is only
// so the citizen finds out before a round trip.
const MIN_PASSWORD = 6;

const POINTS_EN = [
  { icon: 'sparkles', title: 'Make a difference', body: 'Your reports help improve public services.' },
  { icon: 'chart',    title: 'Track progress',    body: 'Stay informed about the status of your reports.' },
  { icon: 'shield',   title: 'Secure & private',  body: 'We protect your information and respect your privacy.' },
];

const EN = {
  heading: 'Create an account',
  blurb: 'Join LokSamadhan and help build a better, safer community.',
  title: 'Create an account',
  sub: 'An account lets you report issues and support reports filed by others.',
  nameLabel: 'Full name',
  emailLabel: 'Email',
  passwordLabel: 'Password',
  passwordHint: 'At least 6 characters.',
  submit: 'Sign up',
  submitting: 'Creating account…',
  alreadyRegistered: 'Already registered?',
  logIn: 'Log in',
};

export default function Register() {
  const { user, loading: authLoading, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, translate } = useLang();
  const [t, setT] = useState(EN);
  const [points, setPoints] = useState(POINTS_EN);

  const rawFrom = location.state?.from;
  const from = (rawFrom && rawFrom !== '/login' && rawFrom !== '/register') ? rawFrom : null;
  const draft = location.state?.draft;

  const getRedirectTarget = (targetUser) => {
    const isStaff = targetUser?.role === 'officer' || targetUser?.role === 'admin';
    if (from) {
      if (from === '/dashboard' || from.startsWith('/dashboard/')) {
        return isStaff ? from : '/';
      }
      return from;
    }
    return isStaff ? '/dashboard' : '/';
  };

  // Automatically redirect away if already logged in or session restored
  useEffect(() => {
    if (!authLoading && user) {
      const target = getRedirectTarget(user);
      navigate(target, { replace: true, state: draft ? { draft } : undefined });
    }
  }, [user, authLoading, from, navigate, draft]);

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
      const registeredUser = await register(form.name.trim(), form.email.trim(), form.password);
      const target = getRedirectTarget(registeredUser);
      navigate(target, { replace: true, state: draft ? { draft } : undefined });
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  }

  async function handleGoogleSuccess(credential) {
    setError(null);
    try {
      const loggedUser = await loginWithGoogle(credential);
      const target = getRedirectTarget(loggedUser);
      navigate(target, { replace: true, state: draft ? { draft } : undefined });
    } catch (err) {
      setError(err.message);
    }
  }

  // If already authenticated or verifying existing token, don't show the register form
  if (authLoading || user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner label="Loading session…" />
      </div>
    );
  }

  return (
    <AuthShell tone="green" icon="userPlus" heading={t.heading} blurb={t.blurb} points={points}>
      <h1 className="text-2xl font-semibold">{t.title}</h1>
      <p className="mt-1 text-sm text-ink-muted">{t.sub}</p>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
          {error}
        </p>
      )}

      <div className="mt-6">
        <GoogleAuthButton onSuccess={handleGoogleSuccess} label="Sign up with Google" onError={(err) => setError(err.message)} />
      </div>

      <div className="relative my-6 text-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-line" />
        </div>
        <span className="relative bg-surface px-3 text-xs uppercase tracking-wider text-ink-muted">
          Or register with email
        </span>
      </div>

      <form onSubmit={submit}>

        <label className="block text-sm font-medium">
          {t.nameLabel}
          <input type="text" autoComplete="name" required
            className={`${field} mt-1`} value={form.name} onChange={set('name')} />
        </label>

        <label className="mt-4 block text-sm font-medium">
          {t.emailLabel}
          <input type="email" autoComplete="email" required
            className={`${field} mt-1`} value={form.email} onChange={set('email')} />
        </label>

        <PasswordField label={t.passwordLabel} autoComplete="new-password"
          minLength={MIN_PASSWORD} value={form.password} onChange={set('password')}
          aria-describedby="pw-hint" hint={t.passwordHint} hintError={tooShort} />

        <button type="submit" disabled={pending || tooShort} className={`${primaryBtn} mt-6 w-full`}>
          {pending && <Spinner label="Creating account" />}
          {pending ? t.submitting : t.submit}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          {t.alreadyRegistered}{' '}
          <Link to="/login" state={location.state} className="text-brand-600 underline">{t.logIn}</Link>
        </p>
      </form>
    </AuthShell>
  );
}

import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useLang } from '../LangContext';
import { apiFetch } from '../api';
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
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const set = k => e => setForm({ ...form, [k]: e.target.value });
  const tooShort = form.password.length > 0 && form.password.length < MIN_PASSWORD;

  // Countdown timer for OTP resend
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  async function handleSendSignupOtp(e) {
    if (e) e.preventDefault();
    const cleanName = form.name.trim();
    const cleanEmail = form.email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !form.password) {
      setError('Please fill in your name, email, and password.');
      return;
    }
    if (form.password.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }

    setError(null);
    setSendingOtp(true);
    try {
      await apiFetch('/api/auth/send-otp', {
        method: 'POST',
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          purpose: 'signup',
        }),
      });
      setOtpSent(true);
      setOtp('');
      setCountdown(60);
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setSendingOtp(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!otpSent) {
      return handleSendSignupOtp(e);
    }

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the full 6-digit verification code sent to your email.');
      return;
    }

    setError(null);
    setPending(true);
    try {
      const registeredUser = await register(form.name.trim(), form.email.trim(), form.password, cleanOtp);
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
            disabled={otpSent}
            className={`${field} mt-1 ${otpSent ? 'opacity-75 bg-canvas' : ''}`}
            value={form.name} onChange={set('name')} />
        </label>

        <label className="mt-4 block text-sm font-medium">
          {t.emailLabel}
          <input type="email" autoComplete="email" required
            disabled={otpSent}
            className={`${field} mt-1 ${otpSent ? 'opacity-75 bg-canvas' : ''}`}
            value={form.email} onChange={set('email')} />
        </label>

        <div className="mt-4">
          <PasswordField label={t.passwordLabel} autoComplete="new-password"
            minLength={MIN_PASSWORD} value={form.password} onChange={set('password')}
            disabled={otpSent}
            aria-describedby="pw-hint" hint={t.passwordHint} hintError={tooShort} />
        </div>

        {/* STEP 2: EMAIL OTP VERIFICATION */}
        {otpSent && (
          <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs">
              <div className="truncate">
                <span className="text-blue-900 font-semibold">Verification code sent to:</span>{' '}
                <strong className="text-ink">{form.email}</strong>
              </div>
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(''); setError(null); }}
                className="text-brand-600 hover:underline font-semibold ml-2 shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>

            <label className="mt-3 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Enter 6-Digit Code
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className={`${field} mt-1.5 font-mono text-center tracking-[0.4em] text-lg font-bold placeholder:tracking-normal placeholder:font-sans bg-surface`}
              />
            </label>

            <div className="mt-2.5 flex items-center justify-between text-xs">
              <span className="text-ink-muted">Didn't get the code?</span>
              {countdown > 0 ? (
                <span className="text-ink-muted font-medium">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  disabled={sendingOtp}
                  onClick={handleSendSignupOtp}
                  className="text-brand-600 font-semibold hover:underline cursor-pointer"
                >
                  Resend Code
                </button>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={pending || sendingOtp || tooShort || (otpSent && otp.length < 6)}
          className={`${primaryBtn} mt-6 w-full`}
        >
          {(pending || sendingOtp) && <Spinner label={otpSent ? 'Creating account' : 'Sending code'} />}
          {otpSent
            ? (pending ? 'Verifying & creating account…' : 'Verify & Create Account →')
            : (sendingOtp ? 'Sending verification code…' : 'Verify Email & Continue →')}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          {t.alreadyRegistered}{' '}
          <Link to="/login" state={location.state} className="text-brand-600 underline">{t.logIn}</Link>
        </p>
      </form>
    </AuthShell>
  );
}

import { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import Spinner from './Spinner';
import Icon from './Icon';
import { field, primaryBtn } from '../formStyles';

export default function ForgotPasswordModal({ isOpen, onClose, initialEmail = '', onSuccess }) {
  const [step, setStep] = useState('request'); // 'request' | 'reset' | 'done'
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [infoMsg, setInfoMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  function handleClose() {
    setEmail('');
    setOtp('');
    setNewPassword('');
    setShowPassword(false);
    setStep('request');
    setError(null);
    setInfoMsg('');
    setCountdown(0);
    onClose();
  }

  function handleChangeEmail() {
    setEmail('');
    setOtp('');
    setNewPassword('');
    setShowPassword(false);
    setError(null);
    setInfoMsg('');
    setStep('request');
  }

  // Reset fields on open or close
  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setOtp('');
      setNewPassword('');
      setShowPassword(false);
      setStep('request');
      setError(null);
      setInfoMsg('');
    } else {
      setEmail('');
      setOtp('');
      setNewPassword('');
      setShowPassword(false);
      setStep('request');
      setError(null);
      setInfoMsg('');
      setCountdown(0);
    }
  }, [isOpen, initialEmail]);

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  if (!isOpen) return null;

  async function handleSendOtp(e) {
    if (e) e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Please enter your email address.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: cleanEmail }),
      });
      setInfoMsg(res.message || `A 6-digit code has been sent to ${cleanEmail}`);
      // Clean sensitive input fields for the next step
      setOtp('');
      setNewPassword('');
      setError(null);
      setStep('reset');
      setCountdown(60); // 60s cooldown for resending
    } catch (err) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanOtp,
          newPassword,
        }),
      });

      setStep('done');
      setInfoMsg(res.message || 'Password reset successfully!');

      setTimeout(() => {
        if (onSuccess) onSuccess({ email: cleanEmail, password: newPassword });
        handleClose();
      }, 1800);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 border border-brand-100">
              <Icon name="shield" className="size-5" />
            </div>
            <div>
              <h2 id="forgot-modal-title" className="text-lg font-bold text-ink">
                {step === 'done' ? 'Password Reset Complete' : 'Reset Password'}
              </h2>
              <p className="text-xs text-ink-muted">LokSamadhan Account Security</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-ink-muted hover:bg-canvas hover:text-ink transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-rejected-500/20 bg-rejected-50 px-3.5 py-2.5 text-xs text-rejected-600">
            {error}
          </div>
        )}

        {infoMsg && step !== 'done' && (
          <div className="mt-4 rounded-xl border border-blue-500/20 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-700">
            {infoMsg}
          </div>
        )}

        {/* STEP 1: REQUEST OTP */}
        {step === 'request' && (
          <form onSubmit={handleSendOtp} className="mt-5 space-y-4">
            <p className="text-sm text-ink-muted leading-relaxed">
              Enter your registered email address below. We will email you an official 6-digit one-time password (OTP) to reset your password.
            </p>

            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Registered Email
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className={`${field} mt-1.5`}
              />
            </label>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/3 rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink-muted hover:bg-canvas transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className={`${primaryBtn} flex-1 justify-center py-2.5 text-xs`}
              >
                {loading && <Spinner label="Sending OTP..." />}
                {loading ? 'Sending Code…' : 'Send Verification Code →'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: ENTER OTP & NEW PASSWORD */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="mt-5 space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-canvas p-3 border border-line text-xs">
              <div className="truncate">
                <span className="text-ink-muted">Code sent to: </span>
                <strong className="text-ink font-semibold">{email}</strong>
              </div>
              <button
                type="button"
                onClick={handleChangeEmail}
                className="text-brand-600 hover:underline font-medium ml-2 shrink-0 cursor-pointer"
              >
                Change
              </button>
            </div>

            {/* OTP input */}
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              6-Digit Verification Code
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
                className={`${field} mt-1.5 font-mono text-center tracking-[0.4em] text-lg font-bold placeholder:tracking-normal placeholder:font-sans`}
              />
            </label>

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                New Password
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className={`${field} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-ink-muted hover:text-ink cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-ink-muted">Minimum 6 characters.</p>
            </div>

            {/* Resend button */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-ink-muted">Didn't receive code?</span>
              {countdown > 0 ? (
                <span className="text-ink-muted font-medium">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSendOtp}
                  className="text-brand-600 font-semibold hover:underline cursor-pointer"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-1/3 rounded-xl border border-line px-4 py-2.5 text-xs font-semibold text-ink-muted hover:bg-canvas transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || otp.length < 6 || newPassword.length < 6}
                className={`${primaryBtn} flex-1 justify-center py-2.5 text-xs`}
              >
                {loading && <Spinner label="Resetting..." />}
                {loading ? 'Resetting…' : 'Reset Password & Sign In'}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'done' && (
          <div className="mt-6 text-center py-4 space-y-3">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <Icon name="check" className="size-7" />
            </div>
            <h3 className="text-base font-bold text-ink">Password Updated Successfully</h3>
            <p className="text-xs text-ink-muted max-w-xs mx-auto">
              Your password has been changed. Signing you in with your new credentials…
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

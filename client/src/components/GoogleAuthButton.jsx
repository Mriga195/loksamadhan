import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import Spinner from './Spinner';

export default function GoogleAuthButton({ onSuccess, onError, label = 'Continue with Google' }) {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setAuthError(null);
      try {
        await onSuccess({ accessToken: tokenResponse.access_token });
      } catch (err) {
        const msg = err.message || 'Google authentication failed';
        setAuthError(msg);
        onError?.(err);
      } finally {
        setLoading(false);
      }
    },
    onError: (err) => {
      console.error('Google login popup error:', err);
      const msg = 'Google authentication was cancelled or could not be completed.';
      setAuthError(msg);
      onError?.(new Error(msg));
      setLoading(false);
    },
  });

  return (
    <div className="w-full">
      {authError && (
        <p role="alert" className="mb-3 w-full rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
          {authError}
        </p>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={() => {
          setAuthError(null);
          googleLogin();
        }}
        className="flex min-h-13 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border border-line bg-surface px-6 text-base font-semibold text-ink shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-canvas active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Spinner label="Authenticating with Google" />
            <span>Signing in with Google…</span>
          </>
        ) : (
          <>
            <svg className="size-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{label}</span>
          </>
        )}
      </button>
    </div>
  );
}

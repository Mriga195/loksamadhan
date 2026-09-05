import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import Spinner from './Spinner';

export default function GoogleAuthButton({ onSuccess, onError, text = 'continue_with' }) {
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  const handleSuccess = async (credentialResponse) => {
    if (!credentialResponse?.credential) {
      setAuthError('No credential received from Google.');
      return;
    }
    setLoading(true);
    setAuthError(null);
    try {
      await onSuccess(credentialResponse.credential);
    } catch (err) {
      const msg = err.message || 'Google authentication failed';
      setAuthError(msg);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFailure = () => {
    const msg = 'Google authentication was cancelled or not completed.';
    setAuthError(msg);
    onError?.(new Error(msg));
  };

  return (
    <div className="w-full flex flex-col items-center">
      {authError && (
        <p role="alert" className="mb-3 w-full rounded-lg bg-rejected-50 px-3 py-2 text-sm text-rejected-600">
          {authError}
        </p>
      )}

      {loading ? (
        <div className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface text-sm font-medium text-ink">
          <Spinner label="Signing in with Google" />
          <span>Authenticating with Google…</span>
        </div>
      ) : (
        <div className="w-full flex justify-center [&>div]:!w-full [&>div>iframe]:!w-full [&_iframe]:!w-full">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={handleFailure}
            text={text}
            shape="rectangular"
            theme="outline"
            size="large"
            width="100%"
          />
        </div>
      )}
    </div>
  );
}

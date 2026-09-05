import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './AuthContext';
import { LangProvider } from './LangContext';
import router from './router';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'dev-dummy-id.apps.googleusercontent.com';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <LangProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </LangProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
);

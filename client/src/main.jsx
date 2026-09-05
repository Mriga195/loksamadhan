import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { LangProvider } from './LangContext';
import router from './router';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LangProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </LangProvider>
  </StrictMode>,
);

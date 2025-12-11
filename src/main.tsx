// Build timestamp: 2025-12-09
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';

console.log('[main] Starting application initialization');

if (isSupabaseConfigured) {
  console.log('[main] ✓ Supabase fully configured and ready');
} else {
  console.warn('[main] ⚠ Supabase not fully configured. Database features may be unavailable.');
  console.log('[main] Environment variables:', {
    url: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
    key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
  });
}

// Always render the app - even without full Supabase configuration
// This allows Google OAuth to work without local database setup
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionContextProvider supabaseClient={supabase}>
      <App />
    </SessionContextProvider>
  </StrictMode>
);

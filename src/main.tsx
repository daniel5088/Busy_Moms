import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { supabase } from './lib/supabase';
import { ConfigurationError } from './components/ConfigurationError';

console.log('[main] Starting application initialization');
console.log('[main] Supabase client status:', supabase ? 'INITIALIZED' : 'NOT INITIALIZED');
console.log('[main] Environment variables:', {
  url: import.meta.env.VITE_SUPABASE_URL ? 'SET' : 'NOT SET',
  key: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
});

if (!supabase) {
  console.error('[main] CRITICAL: Supabase client not initialized. Check .env file and restart dev server.');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {supabase ? (
      <SessionContextProvider supabaseClient={supabase}>
        <App />
      </SessionContextProvider>
    ) : (
      <ConfigurationError error={new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not configured.')} />
    )}
  </StrictMode>
);

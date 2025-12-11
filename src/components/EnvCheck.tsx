import React from 'react';

export function EnvCheck() {
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    MODE: import.meta.env.MODE,
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      background: 'white',
      border: '2px solid red',
      padding: '10px',
      maxWidth: '400px',
      fontSize: '12px',
      zIndex: 9999
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Environment Check</h3>
      <pre style={{ margin: 0, overflow: 'auto' }}>
        {JSON.stringify(envVars, null, 2)}
      </pre>
    </div>
  );
}

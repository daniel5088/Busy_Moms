import React, { useState } from 'react';
import { AlertTriangle, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getOAuthConfig } from '../lib/auth-config';

export function ConnectGoogleCalendarButton({ onConnected } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const oauthConfig = getOAuthConfig();

      console.log('🔑 Starting Google OAuth with Calendar scopes...');
      console.log('📋 OAuth Config:', {
        redirectTo: oauthConfig.redirectTo,
        scopes: oauthConfig.queryParams.scope,
        accessType: oauthConfig.queryParams.access_type,
        prompt: oauthConfig.queryParams.prompt,
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthConfig.redirectTo,
          queryParams: {
            access_type: oauthConfig.queryParams.access_type,
            prompt: oauthConfig.queryParams.prompt,
          },
          scopes: oauthConfig.queryParams.scope,
        },
      });

      if (error) {
        console.error('❌ Google OAuth start error:', error);
        setError(error.message);
        setLoading(false);
        return;
      }

      console.log('✅ Google OAuth redirect started successfully');
      console.log('📍 Redirect URL:', data?.url);

      if (onConnected) {
        try {
          await onConnected();
        } catch (e) {
          console.error('onConnected callback error:', e);
        }
      }
    } catch (e: any) {
      console.error('❌ Unexpected Google auth error:', e);
      const errorMessage = e?.message ?? String(e);
      setError(errorMessage);
      setLoading(false);

      console.error('💡 Troubleshooting steps:');
      console.error('  1. Verify Google OAuth is enabled in Supabase Dashboard');
      console.error('  2. Check that Client ID and Secret are correctly configured');
      console.error('  3. Ensure redirect URI is added in Google Cloud Console');
      console.error('  4. Visit /diagnostics page for detailed configuration check');
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startAuth}
        disabled={loading}
        data-google-calendar-connect
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Calendar className="w-4 h-4" />
        <span>{loading ? 'Connecting...' : 'Connect Google Calendar'}</span>
      </button>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                Check the browser console for troubleshooting steps
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectGoogleCalendarButton;

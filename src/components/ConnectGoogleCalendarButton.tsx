import React, { useState } from "react";
import { AlertTriangle, Calendar } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ConnectGoogleCalendarButton({ onConnected } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAuth = async () => {
    setLoading(true);
    setError(null);

    try {
      const returnTo = window.location.origin;

      // Use Supabase built-in Google OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${returnTo}/auth/callback`, // adjust to your callback route
          // you can also add scopes here if needed:
          // scopes: "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events",
        },
      });

      if (error) {
        console.error("❌ Google OAuth start error:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      // Supabase will redirect the browser to Google automatically.
      // No need to manually set window.location.href here.
      console.log("🔗 Google OAuth redirect started:", data);

      // If you *don’t* get redirected (e.g., in some dev setups),
      // you could optionally call onConnected here, but usually
      // the flow will leave the page.
      if (onConnected) {
        // This will typically run only after the full sign-in flow if you call from somewhere else.
        try {
          await onConnected();
        } catch (e) {
          console.error("onConnected callback error:", e);
        }
      }
    } catch (e: any) {
      console.error("❌ Unexpected Google auth error:", e);
      setError(e?.message ?? String(e));
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={startAuth}
        disabled={loading}
        data-google-calendar-connect
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        <Calendar className="w-4 h-4" />
        <span>{loading ? "Connecting..." : "Connect Google Calendar"}</span>
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default ConnectGoogleCalendarButton;

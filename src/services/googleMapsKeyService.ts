import { supabase } from '../lib/supabase';

let cachedApiKey: string | null = null;

export async function getGoogleMapsApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-google-maps-key`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch Google Maps API key');
    }

    const { apiKey } = await response.json();
    cachedApiKey = apiKey;
    return apiKey;
  } catch (error) {
    console.error('Error fetching Google Maps API key:', error);
    throw error;
  }
}

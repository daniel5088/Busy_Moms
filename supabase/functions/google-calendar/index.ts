/*
  # Google Calendar API Integration

  1. Purpose
    - Proxy Google Calendar API requests with OAuth
    - Handle OAuth token refresh automatically
    - Provide secure access to Google Calendar data

  2. Security
    - Uses service role key for database access
    - Handles authenticated users
    - Automatic token refresh

  3. API Actions
    - ping: health check (no auth)
    - isConnected: check if Google Calendar is connected
    - disconnect: remove stored tokens
    - listUpcoming: get upcoming events
    - getEvents: get events in date range
    - insertEvent: create new calendar event
    - updateEvent: update an event
    - deleteEvent: delete an event
*/

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey, X-Correlation-Id',
};

function jsonResponse(data: any, status = 200, correlationId?: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
    },
  });
}

async function refreshGoogleToken(refreshToken: string, clientId: string, clientSecret: string) {
  console.log('🔄 Refreshing Google access token...');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Token refresh failed:', errorText);
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const tokenData = await response.json();
  console.log('✅ Token refresh successful');
  return tokenData;
}

async function getValidAccessToken(
  serviceSupabase: any,
  userId: string,
  googleClientId: string,
  googleClientSecret: string
) {
  console.log('🔍 Getting valid access token for user:', userId);

  const { data: tokenData, error } = await serviceSupabase
    .from('google_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('❌ Database error fetching tokens:', error);
    throw new Error(`Database error: ${error.message}`);
  }

  if (!tokenData) {
    console.error('❌ No Google tokens found for user:', userId);
    throw new Error('Google Calendar not connected. Please connect your Google Calendar first.');
  }

  console.log('✅ Found stored tokens, checking expiry...');

  const now = new Date();
  const expiry = new Date(tokenData.expiry_ts);

  if (now >= expiry) {
    console.log('⏰ Token expired, refreshing...');

    if (!tokenData.refresh_token) {
      console.error('❌ No refresh token available');
      throw new Error('Google Calendar connection expired. Please reconnect your Google Calendar.');
    }

    try {
      const refreshResponse = await refreshGoogleToken(
        tokenData.refresh_token,
        googleClientId,
        googleClientSecret
      );

      const newExpiry = new Date(Date.now() + refreshResponse.expires_in * 1000);

      const { error: updateError } = await serviceSupabase
        .from('google_tokens')
        .update({
          access_token: refreshResponse.access_token,
          expiry_ts: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Failed to update refreshed token:', updateError);
        throw new Error(`Failed to update token: ${updateError.message}`);
      }

      console.log('✅ Token refreshed and updated');
      return refreshResponse.access_token;
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw new Error(
        'Failed to refresh Google Calendar token. Please reconnect your Google Calendar.'
      );
    }
  }

  console.log('✅ Using existing valid token');
  return tokenData.access_token;
}

async function makeGoogleCalendarRequest(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
) {
  const url = `https://www.googleapis.com/calendar/v3${endpoint}`;

  console.log(`📡 Making Google Calendar API request: ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `❌ Google Calendar API error: ${response.status} ${response.statusText} - ${errorText}`
    );
    throw new Error(
      `Google Calendar API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  console.log('✅ Google Calendar API request successful');
  return data;
}

async function getAuthenticatedUser(req: Request, supabase: any) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}

Deno.serve(async (req: Request) => {
  // 🔹 Get or generate correlation ID for this request
  const incomingId = req.headers.get('x-correlation-id');
  const correlationId = incomingId ?? crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'x-correlation-id': correlationId,
      },
    });
  }

  try {
    console.log(`🚀 Google Calendar API - ${req.method} ${req.url}`, {
      correlationId,
    });

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, correlationId);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables', {
        correlationId,
      });
      return jsonResponse(
        {
          error: 'Server configuration error',
          details: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY',
        },
        500,
        correlationId
      );
    }

    if (!googleClientId || !googleClientSecret) {
      console.error('❌ Missing Google OAuth credentials', { correlationId });
      return jsonResponse(
        {
          error: 'Google Calendar not configured',
          details:
            'Missing GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables. Please configure these in your Supabase project settings.',
        },
        500,
        correlationId
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (error) {
      console.error('❌ Invalid JSON in request body:', error, {
        correlationId,
      });
      return jsonResponse({ error: 'Invalid JSON in request body' }, 400, correlationId);
    }

    const { action } = body;

    if (!action) {
      return jsonResponse({ error: 'Missing action parameter' }, 400, correlationId);
    }

    // 🔹 Simple ping action for diagnostics (no auth needed)
    if (action === 'ping') {
      console.log('📶 Google Calendar ping received', { correlationId });
      return jsonResponse({ ok: true, source: 'google-calendar' }, 200, correlationId);
    }

    // 🔹 From here on, we require an authenticated Supabase user
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    });

    let userId: string;
    try {
      const user = await getAuthenticatedUser(req, supabase);
      userId = user.id;
      console.log('✅ Authenticated user:', userId, { correlationId });
    } catch (error: any) {
      console.error('❌ Authentication failed:', error, { correlationId });

      // For any non-ping action, we expect a logged-in user
      return jsonResponse(
        {
          error: 'Unauthorized',
          message: error instanceof Error ? error.message : 'Authentication required',
        },
        401,
        correlationId
      );
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 🔹 isConnected: check if tokens exist for this user
    if (action === 'isConnected') {
      try {
        const { data: tokenData, error } = await serviceSupabase
          .from('google_tokens')
          .select('access_token, expiry_ts')
          .eq('user_id', userId)
          .maybeSingle();

        const isConnected = !error && !!tokenData?.access_token;
        console.log(`🔍 Connection check for user ${userId}: ${isConnected}`, {
          correlationId,
        });

        return jsonResponse(
          {
            connected: isConnected,
            expiry_ts: tokenData?.expiry_ts ?? null,
          },
          200,
          correlationId
        );
      } catch (error: any) {
        console.error('❌ Connection check failed:', error, { correlationId });
        return jsonResponse({ connected: false, error: error.message }, 500, correlationId);
      }
    }

    // 🔹 disconnect: delete stored tokens
    if (action === 'disconnect') {
      try {
        const { error } = await serviceSupabase
          .from('google_tokens')
          .delete()
          .eq('user_id', userId);

        if (error) {
          console.error('❌ Failed to disconnect Google Calendar:', error, { correlationId });
          return jsonResponse(
            {
              success: false,
              error: 'Failed to disconnect Google Calendar',
              details: error.message,
            },
            500,
            correlationId
          );
        }

        console.log(`✅ Google Calendar disconnected for user: ${userId}`, {
          correlationId,
        });
        return jsonResponse(
          {
            success: true,
            message: 'Google Calendar disconnected successfully',
          },
          200,
          correlationId
        );
      } catch (error: any) {
        console.error('❌ Disconnect action failed:', error, {
          correlationId,
        });
        return jsonResponse(
          {
            success: false,
            error: 'Failed to disconnect Google Calendar',
            details: error instanceof Error ? error.message : 'Unknown error',
          },
          500,
          correlationId
        );
      }
    }

    // 🔹 For all remaining actions we need a valid Google access token
    let accessToken: string;
    try {
      accessToken = await getValidAccessToken(
        serviceSupabase,
        userId,
        googleClientId,
        googleClientSecret
      );
    } catch (error: any) {
      console.error('❌ Failed to get Google access token:', error, {
        correlationId,
      });
      return jsonResponse(
        {
          error: 'Google Calendar authentication failed',
          details: error instanceof Error ? error.message : 'Unknown authentication error',
          action: 'reconnect_required',
        },
        401,
        correlationId
      );
    }

    console.log(`📅 Processing Google Calendar action: ${action} for user: ${userId}`, {
      correlationId,
    });

    switch (action) {
      case 'listUpcoming': {
        const maxResults = Math.min(Math.max(1, parseInt(body.maxResults) || 10), 100);
        const timeMin = new Date().toISOString();

        const events = await makeGoogleCalendarRequest(
          accessToken,
          `/calendars/primary/events?timeMin=${encodeURIComponent(
            timeMin
          )}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`
        );

        return jsonResponse(events, 200, correlationId);
      }

      case 'getEvents': {
        const { timeMin, timeMax, maxResults = 250, q } = body;

        const validatedMaxResults = Math.min(Math.max(1, parseInt(maxResults) || 250), 250);

        if (timeMin && isNaN(Date.parse(timeMin))) {
          return jsonResponse({ error: 'Invalid timeMin format' }, 400, correlationId);
        }
        if (timeMax && isNaN(Date.parse(timeMax))) {
          return jsonResponse({ error: 'Invalid timeMax format' }, 400, correlationId);
        }
        if (q && typeof q !== 'string') {
          return jsonResponse({ error: 'Invalid search query format' }, 400, correlationId);
        }

        let endpoint = `/calendars/primary/events?singleEvents=true&orderBy=startTime&maxResults=${validatedMaxResults}`;

        if (timeMin) {
          endpoint += `&timeMin=${encodeURIComponent(timeMin)}`;
        }
        if (timeMax) {
          endpoint += `&timeMax=${encodeURIComponent(timeMax)}`;
        }
        if (q) {
          endpoint += `&q=${encodeURIComponent(q)}`;
        }

        const events = await makeGoogleCalendarRequest(accessToken, endpoint);
        return jsonResponse(events, 200, correlationId);
      }

      case 'insertEvent': {
        const { event } = body;

        if (!event || typeof event !== 'object') {
          return jsonResponse({ error: 'Missing or invalid event data' }, 400, correlationId);
        }

        if (!event.summary || typeof event.summary !== 'string') {
          return jsonResponse({ error: 'Event must have a valid summary' }, 400, correlationId);
        }

        const createdEvent = await makeGoogleCalendarRequest(
          accessToken,
          '/calendars/primary/events',
          {
            method: 'POST',
            body: JSON.stringify(event),
          }
        );

        return jsonResponse(createdEvent, 200, correlationId);
      }

      case 'updateEvent': {
        const { eventId, event } = body;

        if (!eventId || typeof eventId !== 'string') {
          return jsonResponse({ error: 'Missing or invalid eventId' }, 400, correlationId);
        }
        if (!event || typeof event !== 'object') {
          return jsonResponse({ error: 'Missing or invalid event data' }, 400, correlationId);
        }

        const updatedEvent = await makeGoogleCalendarRequest(
          accessToken,
          `/calendars/primary/events/${eventId}`,
          {
            method: 'PUT',
            body: JSON.stringify(event),
          }
        );

        return jsonResponse(updatedEvent, 200, correlationId);
      }

      case 'deleteEvent': {
        const { eventId } = body;

        if (!eventId || typeof eventId !== 'string') {
          return jsonResponse({ error: 'Missing or invalid eventId' }, 400, correlationId);
        }

        await makeGoogleCalendarRequest(accessToken, `/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
        });

        return jsonResponse(
          { success: true, message: 'Event deleted successfully' },
          200,
          correlationId
        );
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, correlationId);
    }
  } catch (error) {
    console.error('❌ Google Calendar function error:', error, {
      correlationId,
    });

    return jsonResponse(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      },
      500,
      correlationId
    );
  }
});

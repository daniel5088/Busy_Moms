/*
  # Google Calendar API Integration (Edge Function)

  - Secure Google Calendar API access for authenticated users
  - Uses Supabase service role for token storage access
  - Automatically refreshes Google access tokens
  - Returns reconnect_required for broken OAuth state

  Actions:
    - ping (no auth)
    - isConnected
    - getEvents
    - insertEvent
    - updateEvent
    - deleteEvent
    - listUpcoming
    - disconnect
    - diagnostics
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

type GoogleTokenRow = {
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expiry_ts: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function getCorrelationId(req: Request) {
  const incomingId =
    req.headers.get('x-correlation-id') ?? req.headers.get('X-Correlation-Id');
  return incomingId ?? crypto.randomUUID();
}

async function refreshGoogleToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
) {
  console.log('🔄 Refreshing Google access token...');

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('❌ Token refresh failed:', {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });

    let errorDetails = responseText;
    try {
      const errorJson = JSON.parse(responseText);
      errorDetails = errorJson.error_description || errorJson.error || responseText;
    } catch {
      // ignore
    }

    if (
      responseText.includes('invalid_grant') ||
      responseText.includes('Token has been expired or revoked')
    ) {
      const e = new Error('REFRESH_TOKEN_REVOKED');
      // @ts-ignore
      e.code = 'REFRESH_TOKEN_REVOKED';
      throw e;
    }

    throw new Error(`Token refresh failed: ${response.status} - ${errorDetails}`);
  }

  const tokenData = JSON.parse(responseText);

  if (!tokenData.access_token) {
    console.error('❌ Invalid token response - missing access_token:', tokenData);
    throw new Error('Invalid token response from Google (missing access_token)');
  }

  console.log('✅ Token refresh successful', {
    expires_in: tokenData.expires_in,
    token_type: tokenData.token_type,
  });

  return tokenData as {
    access_token: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };
}

async function getValidAccessToken(opts: {
  serviceSupabase: ReturnType<typeof createClient>;
  userId: string;
  googleClientId: string;
  googleClientSecret: string;
  correlationId: string;
}) {
  const { serviceSupabase, userId, googleClientId, googleClientSecret, correlationId } = opts;

  console.log('🔍 Getting valid access token for user:', userId, { correlationId });

  const { data: tokenData, error } = await serviceSupabase
    .from('google_tokens')
    .select('user_id, access_token, refresh_token, expiry_ts, created_at, updated_at')
    .eq('user_id', userId)
    .maybeSingle<GoogleTokenRow>();

  if (error) {
    console.error('❌ DB error fetching tokens:', error, { correlationId });
    throw new Error(`DB_ERROR: ${error.message}`);
  }

  if (!tokenData) {
    console.error('❌ No Google tokens found for user:', userId, { correlationId });
    throw new Error('NOT_CONNECTED');
  }

  const now = new Date();

  const expiry = tokenData.expiry_ts ? new Date(tokenData.expiry_ts) : null;
  const expiryValid = !!expiry && !Number.isNaN(expiry.getTime());

  const expiresInMinutes = expiryValid
    ? (expiry!.getTime() - now.getTime()) / (1000 * 60)
    : -999;

  const shouldRefresh = !expiryValid || expiresInMinutes < 5;

  console.log('⏰ Token expiry check:', {
    now: now.toISOString(),
    expiry_ts: tokenData.expiry_ts,
    expiryValid,
    expiresInMinutes: Math.round(expiresInMinutes),
    shouldRefresh,
    has_access_token: !!tokenData.access_token,
    has_refresh_token: !!tokenData.refresh_token,
    correlationId,
  });

  if (!shouldRefresh && tokenData.access_token) {
    console.log('✅ Using existing valid access token', {
      expiresInMinutes: Math.round(expiresInMinutes),
      correlationId,
    });
    return tokenData.access_token;
  }

  if (!tokenData.refresh_token) {
    console.error('❌ Missing refresh token; cannot refresh', { correlationId });

    const e = new Error('REFRESH_TOKEN_MISSING');
    // @ts-ignore
    e.code = 'REFRESH_TOKEN_MISSING';
    throw e;
  }

  let refreshResponse: Awaited<ReturnType<typeof refreshGoogleToken>>;
  try {
    refreshResponse = await refreshGoogleToken(
      tokenData.refresh_token,
      googleClientId,
      googleClientSecret
    );
  } catch (err: any) {
    console.error('❌ Refresh attempt failed', err, { correlationId });

    if (err?.message === 'REFRESH_TOKEN_REVOKED' || err?.code === 'REFRESH_TOKEN_REVOKED') {
      console.log('🗑️ Refresh token revoked; deleting token record', { correlationId });

      await serviceSupabase.from('google_tokens').delete().eq('user_id', userId);
      const e = new Error('REFRESH_TOKEN_REVOKED');
      // @ts-ignore
      e.code = 'REFRESH_TOKEN_REVOKED';
      throw e;
    }

    throw new Error(`TOKEN_REFRESH_FAILED: ${err?.message ?? String(err)}`);
  }

  const expiresIn = refreshResponse.expires_in ?? 3600;
  const bufferedSeconds = Math.max(expiresIn - 300, 60);
  const newExpiry = new Date(Date.now() + bufferedSeconds * 1000);

  console.log('💾 Updating token in DB', {
    userId,
    newExpiry: newExpiry.toISOString(),
    expiresIn,
    correlationId,
  });

  const { error: updateError } = await serviceSupabase
    .from('google_tokens')
    .update({
      access_token: refreshResponse.access_token,
      expiry_ts: newExpiry.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    console.error('❌ Failed updating refreshed token in DB:', updateError, { correlationId });
    throw new Error(`DB_UPDATE_FAILED: ${updateError.message}`);
  }

  console.log('✅ Token refreshed and saved', { correlationId });
  return refreshResponse.access_token;
}

async function makeGoogleCalendarRequest(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {}
) {
  const url = `https://www.googleapis.com/calendar/v3${endpoint}`;

  console.log(`📡 Google Calendar request: ${options.method || 'GET'} ${endpoint}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Google Calendar API error: ${response.status} ${response.statusText}`, {
      endpoint,
      errorText,
    });
    throw new Error(
      `Google Calendar API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  console.log('✅ Google Calendar API success');
  return data;
}

async function getAuthenticatedUserId(req: Request, supabaseAnonAuthed: ReturnType<typeof createClient>) {
  const {
    data: { user },
    error,
  } = await supabaseAnonAuthed.auth.getUser();

  if (error || !user) throw new Error('Unauthorized');
  return user.id;
}

function authErrorPayload(code: string, details: string) {
  return {
    error: 'Google Calendar authentication failed',
    details,
    action: 'reconnect_required',
    code,
  };
}

Deno.serve(async (req: Request) => {
  const correlationId = getCorrelationId(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: { ...corsHeaders, 'x-correlation-id': correlationId },
    });
  }

  try {
    console.log(`🚀 Google Calendar - ${req.method} ${req.url}`, { correlationId });

    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, correlationId);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error('❌ Missing Supabase env', { correlationId });
      return jsonResponse(
        {
          error: 'Server configuration error',
          details:
            'Missing SUPABASE_URL, SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY',
        },
        500,
        correlationId
      );
    }

    if (!googleClientId || !googleClientSecret) {
      console.error('❌ Missing Google OAuth env', { correlationId });
      return jsonResponse(
        {
          error: 'Google Calendar not configured',
          details:
            'Missing GOOGLE_CLIENT_ID and/or GOOGLE_CLIENT_SECRET in Edge Function secrets.',
        },
        500,
        correlationId
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: 'Invalid JSON in request body' }, 400, correlationId);
    }

    const action = body?.action;
    if (!action) return jsonResponse({ error: 'Missing action parameter' }, 400, correlationId);

    if (action === 'ping') {
      return jsonResponse({ ok: true, source: 'google-calendar' }, 200, correlationId);
    }

    const supabaseAnonAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          Authorization: req.headers.get('Authorization') || '',
        },
      },
    });

    let userId: string;
    try {
      userId = await getAuthenticatedUserId(req, supabaseAnonAuthed);
      console.log('✅ Authenticated user', { userId, correlationId });
    } catch (err) {
      console.error('❌ Unauthorized', err, { correlationId });
      return jsonResponse({ error: 'Unauthorized' }, 401, correlationId);
    }

    const serviceSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === 'isConnected') {
      const { data: tokenData, error } = await serviceSupabase
        .from('google_tokens')
        .select('access_token, refresh_token, expiry_ts')
        .eq('user_id', userId)
        .maybeSingle<GoogleTokenRow>();

      if (error) {
        return jsonResponse(
          { connected: false, error: error.message },
          500,
          correlationId
        );
      }

      const connected = !!tokenData?.refresh_token;
      return jsonResponse(
        { connected, expiry_ts: tokenData?.expiry_ts ?? null },
        200,
        correlationId
      );
    }

    if (action === 'disconnect') {
      const { error } = await serviceSupabase
        .from('google_tokens')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Failed to disconnect:', error, { correlationId });
        return jsonResponse(
          { error: 'Failed to disconnect', details: error.message },
          500,
          correlationId
        );
      }

      console.log('✅ Google Calendar disconnected', { userId, correlationId });
      return jsonResponse({ success: true, message: 'Disconnected successfully' }, 200, correlationId);
    }

    let accessToken: string;
    try {
      accessToken = await getValidAccessToken({
        serviceSupabase,
        userId,
        googleClientId,
        googleClientSecret,
        correlationId,
      });
    } catch (err: any) {
      const msg = err?.message ?? String(err);

      console.error('❌ Failed to get Google access token', { msg, correlationId });

      if (msg === 'NOT_CONNECTED') {
        return jsonResponse(authErrorPayload('NOT_CONNECTED', 'Please connect Google in Settings.'), 401, correlationId);
      }
      if (msg === 'REFRESH_TOKEN_MISSING') {
        return jsonResponse(
          authErrorPayload('REFRESH_TOKEN_MISSING', 'Missing refresh token. Please reconnect Google.'),
          401,
          correlationId
        );
      }
      if (msg === 'REFRESH_TOKEN_REVOKED') {
        return jsonResponse(
          authErrorPayload('REFRESH_TOKEN_REVOKED', 'Access revoked. Please reconnect Google.'),
          401,
          correlationId
        );
      }

      return jsonResponse(
        authErrorPayload('AUTH_FAILED', msg),
        401,
        correlationId
      );
    }

    console.log('✅ Processing action', { action, userId, correlationId });

    switch (action) {
      case 'getEvents': {
        try {
          const { timeMin, timeMax, maxResults, q } = body ?? {};

          let endpoint = '/calendars/primary/events?singleEvents=true&orderBy=startTime';

          if (timeMin) endpoint += `&timeMin=${encodeURIComponent(timeMin)}`;
          if (timeMax) endpoint += `&timeMax=${encodeURIComponent(timeMax)}`;
          if (maxResults) endpoint += `&maxResults=${Math.min(Number(maxResults), 2500)}`;
          if (q) endpoint += `&q=${encodeURIComponent(q)}`;

          console.log('📅 Fetching Google Calendar events', { endpoint, correlationId });
          const events = await makeGoogleCalendarRequest(accessToken, endpoint);
          console.log('✅ Successfully fetched events', { count: events.items?.length || 0, correlationId });
          return jsonResponse(events, 200, correlationId);
        } catch (error: any) {
          console.error('❌ getEvents action failed:', error, { correlationId });
          return jsonResponse(
            {
              error: 'Failed to fetch events',
              details: error?.message || String(error),
              code: 'GET_EVENTS_FAILED',
            },
            500,
            correlationId
          );
        }
      }

      case 'listUpcoming': {
        try {
          const maxResults = Number(body?.maxResults ?? 10);
          const now = new Date().toISOString();

          const endpoint = `/calendars/primary/events?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(now)}&maxResults=${Math.min(maxResults, 100)}`;

          console.log('📅 Fetching upcoming events', { maxResults, correlationId });
          const events = await makeGoogleCalendarRequest(accessToken, endpoint);
          console.log('✅ Successfully fetched upcoming events', { count: events.items?.length || 0, correlationId });
          return jsonResponse(events, 200, correlationId);
        } catch (error: any) {
          console.error('❌ listUpcoming action failed:', error, { correlationId });
          return jsonResponse(
            {
              error: 'Failed to fetch upcoming events',
              details: error?.message || String(error),
              code: 'LIST_UPCOMING_FAILED',
            },
            500,
            correlationId
          );
        }
      }

      case 'insertEvent': {
        const event = body?.event;
        if (!event || typeof event !== 'object') {
          return jsonResponse({ error: 'Missing or invalid event data' }, 400, correlationId);
        }
        if (!event.summary || typeof event.summary !== 'string') {
          return jsonResponse({ error: 'Event must have a valid summary' }, 400, correlationId);
        }

        // Validate start and end
        if (!event.start) {
          return jsonResponse({ error: 'Event must have a start time' }, 400, correlationId);
        }
        if (!event.end) {
          return jsonResponse({ error: 'Event must have an end time' }, 400, correlationId);
        }

        console.log('📅 Creating Google Calendar event:', {
          summary: event.summary,
          start: event.start,
          end: event.end,
          hasAttendees: !!event.attendees,
          attendeesCount: event.attendees?.length || 0,
          correlationId,
        });

        try {
          const createdEvent = await makeGoogleCalendarRequest(accessToken, '/calendars/primary/events', {
            method: 'POST',
            body: JSON.stringify(event),
          });

          console.log('✅ Event created successfully:', createdEvent.id, { correlationId });
          return jsonResponse(createdEvent, 200, correlationId);
        } catch (error: any) {
          console.error('❌ Failed to create event in Google Calendar:', {
            error: error?.message || String(error),
            event: { summary: event.summary, start: event.start, end: event.end },
            correlationId,
          });
          return jsonResponse(
            {
              error: 'Failed to create event',
              details: error?.message || String(error),
              code: 'INSERT_EVENT_FAILED',
            },
            500,
            correlationId
          );
        }
      }

      case 'updateEvent': {
        const { eventId, event } = body ?? {};
        if (!eventId || typeof eventId !== 'string') {
          return jsonResponse({ error: 'Missing or invalid eventId' }, 400, correlationId);
        }
        if (!event || typeof event !== 'object') {
          return jsonResponse({ error: 'Missing or invalid event data' }, 400, correlationId);
        }

        const updatedEvent = await makeGoogleCalendarRequest(
          accessToken,
          `/calendars/primary/events/${eventId}`,
          { method: 'PATCH', body: JSON.stringify(event) }
        );

        return jsonResponse(updatedEvent, 200, correlationId);
      }

      case 'deleteEvent': {
        const { eventId } = body ?? {};
        if (!eventId || typeof eventId !== 'string') {
          return jsonResponse({ error: 'Missing or invalid eventId' }, 400, correlationId);
        }

        await makeGoogleCalendarRequest(accessToken, `/calendars/primary/events/${eventId}`, {
          method: 'DELETE',
        });

        return jsonResponse({ success: true, message: 'Event deleted successfully' }, 200, correlationId);
      }

      case 'diagnostics': {
        const { data: tokenData, error } = await serviceSupabase
          .from('google_tokens')
          .select('expiry_ts, created_at, updated_at, refresh_token')
          .eq('user_id', userId)
          .maybeSingle<GoogleTokenRow>();

        if (error) {
          return jsonResponse(
            { status: 'error', message: 'Database error', error: error.message },
            500,
            correlationId
          );
        }

        if (!tokenData) {
          return jsonResponse(
            { status: 'not_connected', message: 'No Google connection found' },
            200,
            correlationId
          );
        }

        const now = new Date();
        const expiry = tokenData.expiry_ts ? new Date(tokenData.expiry_ts) : null;
        const expiryValid = !!expiry && !Number.isNaN(expiry.getTime());

        const minutesUntilExpiry = expiryValid
          ? (expiry!.getTime() - now.getTime()) / (1000 * 60)
          : null;

        const isExpired = expiryValid ? now >= expiry! : true;

        return jsonResponse(
          {
            status: 'connected',
            token_status: isExpired ? 'expired' : 'valid',
            expiry_ts: tokenData.expiry_ts,
            minutes_until_expiry: minutesUntilExpiry !== null ? Math.round(minutesUntilExpiry) : null,
            created_at: tokenData.created_at ?? null,
            updated_at: tokenData.updated_at ?? null,
            has_refresh_token: !!tokenData.refresh_token,
            needs_refresh: !expiryValid || isExpired || (minutesUntilExpiry !== null && minutesUntilExpiry < 5),
          },
          200,
          correlationId
        );
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, correlationId);
    }
  } catch (error: any) {
    const correlationId = crypto.randomUUID();
    console.error('❌ Google Calendar function error:', error, { correlationId });

    return jsonResponse(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred',
        details: error?.message ?? String(error),
      },
      500,
      correlationId
    );
  }
});

/*
  # Google Contacts API Integration (Edge Function)

  - Secure Google Contacts API access for authenticated users
  - Uses Supabase service role for token storage access
  - Automatically refreshes Google access tokens
  - Returns reconnect_required for broken OAuth state

  Actions:
    - ping (no auth)
    - isConnected
    - listContacts
    - getContact
    - createContact
    - updateContact
    - deleteContact
    - syncContacts (bidirectional sync)
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
  forceRefresh?: boolean;
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

  const forceRefresh = opts.forceRefresh || false;

  if (!shouldRefresh && !forceRefresh && tokenData.access_token) {
    console.log('✅ Using existing valid access token', {
      expiresInMinutes: Math.round(expiresInMinutes),
      correlationId,
    });
    return tokenData.access_token;
  }

  if (forceRefresh) {
    console.log('🔄 Force refreshing token after 401 error', { correlationId });
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

async function makeGooglePeopleRequest(
  accessToken: string,
  endpoint: string,
  options: RequestInit = {},
  correlationId?: string
) {
  const url = `https://people.googleapis.com/v1${endpoint}`;

  const tokenPreview = accessToken ? `${accessToken.substring(0, 4)}...${accessToken.substring(accessToken.length - 4)}` : 'MISSING';
  console.log(`📡 Google People API request: ${options.method || 'GET'} ${endpoint}`, {
    tokenPreview,
    tokenLength: accessToken?.length || 0,
    correlationId,
  });

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
    console.error(`❌ Google People API error: ${response.status} ${response.statusText}`, {
      endpoint,
      errorText,
      tokenPreview,
      correlationId,
    });

    if (response.status === 401) {
      throw new Error(
        `INVALID_TOKEN: Token authentication failed - ${errorText}`
      );
    }

    throw new Error(
      `Google People API error: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  console.log('✅ Google People API success', { correlationId });
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
    error: 'Google Contacts authentication failed',
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
    console.log(`🚀 Google Contacts - ${req.method} ${req.url}`, { correlationId });

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
          error: 'Google Contacts not configured',
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
      return jsonResponse({ ok: true, source: 'google-contacts' }, 200, correlationId);
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
      case 'listContacts': {
        try {
          const { pageSize, pageToken } = body ?? {};

          let endpoint = '/people/me/connections?personFields=names,emailAddresses,phoneNumbers,photos,metadata';

          if (pageSize) endpoint += `&pageSize=${Math.min(Number(pageSize), 1000)}`;
          if (pageToken) endpoint += `&pageToken=${encodeURIComponent(pageToken)}`;

          console.log('👥 Fetching Google Contacts', { endpoint, correlationId });
          const contacts = await makeGooglePeopleRequest(accessToken, endpoint, {}, correlationId);
          console.log('✅ Successfully fetched contacts', { count: contacts.connections?.length || 0, correlationId });
          return jsonResponse(contacts, 200, correlationId);
        } catch (error: any) {
          console.error('❌ listContacts action failed:', error, { correlationId });
          return jsonResponse(
            {
              error: 'Failed to fetch contacts',
              details: error?.message || String(error),
              code: 'LIST_CONTACTS_FAILED',
            },
            500,
            correlationId
          );
        }
      }

      case 'getContact': {
        try {
          const { resourceName } = body ?? {};
          if (!resourceName || typeof resourceName !== 'string') {
            return jsonResponse({ error: 'Missing or invalid resourceName' }, 400, correlationId);
          }

          const endpoint = `/${resourceName}?personFields=names,emailAddresses,phoneNumbers,photos,metadata`;

          console.log('👤 Fetching Google Contact', { resourceName, correlationId });
          const contact = await makeGooglePeopleRequest(accessToken, endpoint, {}, correlationId);
          console.log('✅ Successfully fetched contact', { correlationId });
          return jsonResponse(contact, 200, correlationId);
        } catch (error: any) {
          console.error('❌ getContact action failed:', error, { correlationId });
          return jsonResponse(
            {
              error: 'Failed to fetch contact',
              details: error?.message || String(error),
              code: 'GET_CONTACT_FAILED',
            },
            500,
            correlationId
          );
        }
      }

      case 'createContact': {
        const { contact } = body ?? {};
        if (!contact || typeof contact !== 'object') {
          return jsonResponse({ error: 'Missing or invalid contact data' }, 400, correlationId);
        }

        console.log('👥 Creating Google Contact', { correlationId });

        try {
          const createdContact = await makeGooglePeopleRequest(
            accessToken,
            '/people:createContact?personFields=names,emailAddresses,phoneNumbers,metadata',
            {
              method: 'POST',
              body: JSON.stringify(contact),
            },
            correlationId
          );

          console.log('✅ Contact created successfully', { correlationId });
          return jsonResponse(createdContact, 200, correlationId);
        } catch (error: any) {
          console.error('❌ Failed to create contact in Google:', {
            error: error?.message || String(error),
            correlationId,
          });
          return jsonResponse(
            {
              error: 'Failed to create contact',
              details: error?.message || String(error),
              code: 'CREATE_CONTACT_FAILED',
            },
            500,
            correlationId
          );
        }
      }

      case 'updateContact': {
        const { resourceName, contact, updatePersonFields } = body ?? {};
        if (!resourceName || typeof resourceName !== 'string') {
          return jsonResponse({ error: 'Missing or invalid resourceName' }, 400, correlationId);
        }
        if (!contact || typeof contact !== 'object') {
          return jsonResponse({ error: 'Missing or invalid contact data' }, 400, correlationId);
        }

        const fields = updatePersonFields || 'names,emailAddresses,phoneNumbers';

        const updatedContact = await makeGooglePeopleRequest(
          accessToken,
          `/${resourceName}:updateContact?updatePersonFields=${fields}`,
          { method: 'PATCH', body: JSON.stringify(contact) },
          correlationId
        );

        return jsonResponse(updatedContact, 200, correlationId);
      }

      case 'deleteContact': {
        const { resourceName } = body ?? {};
        if (!resourceName || typeof resourceName !== 'string') {
          return jsonResponse({ error: 'Missing or invalid resourceName' }, 400, correlationId);
        }

        await makeGooglePeopleRequest(
          accessToken,
          `/${resourceName}:deleteContact`,
          {
            method: 'DELETE',
          },
          correlationId
        );

        return jsonResponse({ success: true, message: 'Contact deleted successfully' }, 200, correlationId);
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400, correlationId);
    }
  } catch (error: any) {
    const correlationId = crypto.randomUUID();
    console.error('❌ Google Contacts function error:', error, { correlationId });

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

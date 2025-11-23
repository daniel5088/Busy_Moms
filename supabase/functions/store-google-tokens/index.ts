import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.55.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: any, status = 200, correlationId?: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(correlationId ? { 'x-correlation-id': correlationId } : {}),
    },
  });
}

function getCorrelationId(req: Request) {
  return req.headers.get('x-correlation-id') || req.headers.get('X-Correlation-ID') || crypto.randomUUID();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const correlationId = getCorrelationId(req);
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'x-correlation-id': correlationId,
      },
    });
  }

  try {
    const correlationId = getCorrelationId(req);
    console.log('🔐 Store Google Tokens function called', { correlationId });

    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405, correlationId);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('❌ Missing Supabase environment variables', { correlationId });
      return jsonResponse({ 
        error: "Server configuration error",
        details: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
      }, 500, correlationId);
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch (error) {
      console.error("❌ Invalid JSON in request body:", error, { correlationId });
      return jsonResponse({ error: "Invalid JSON in request body" }, 400, correlationId);
    }

    const { userId, accessToken, refreshToken, expiresIn, providerUserId, scope } = body;

    if (!userId || !accessToken || !refreshToken) {
      console.error('❌ Missing required fields:', { userId: !!userId, accessToken: !!accessToken, refreshToken: !!refreshToken }, { correlationId });
      return jsonResponse({ 
        error: "Missing required fields",
        details: "userId, accessToken, and refreshToken are required"
      }, 400, correlationId);
    }

    console.log('📝 Storing tokens for user:', userId, { correlationId });
    console.log('Token info:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      expiresIn,
      providerUserId: providerUserId || 'not provided',
      scope: scope || 'not provided'
    });

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const expiryTs = new Date(Date.now() + ((expiresIn || 3600) * 1000)).toISOString();

    const tokenData = {
      user_id: userId,
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_ts: expiryTs,
      provider_user_id: providerUserId || null,
      scope: scope || null,
      token_type: 'Bearer',
      updated_at: new Date().toISOString()
    };

    const { data: existing, error: checkError } = await supabase
      .from('google_tokens')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing tokens:', checkError, { correlationId });
      return jsonResponse({ 
        error: "Database error checking existing tokens",
        details: checkError.message
      }, 500, correlationId);
    }

    let result;
    if (existing) {
      console.log('🔄 Updating existing tokens');
      const { data, error } = await supabase
        .from('google_tokens')
        .update(tokenData)
        .eq('user_id', userId)
        .select()
        .single();
      
      result = { data, error };
    } else {
      console.log('➕ Inserting new tokens');
      const { data, error } = await supabase
        .from('google_tokens')
        .insert([{ ...tokenData, created_at: new Date().toISOString() }])
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('❌ Error storing tokens:', result.error, { correlationId });
      return jsonResponse({ 
        error: "Failed to store tokens",
        details: result.error.message
      }, 500, correlationId);
    }

    console.log('✅ Tokens stored successfully', { correlationId });
    return jsonResponse({ 
      success: true,
      message: "Tokens stored successfully",
      expiryTs
    }, 200, correlationId);

  } catch (error) {
    console.error('❌ Store Google Tokens function error:', error);
    return jsonResponse({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
      details: "Check server logs for more information"
    }, 500, getCorrelationId(req));
  }
});

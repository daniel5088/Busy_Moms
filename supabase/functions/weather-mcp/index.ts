import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, x-weather-mcp-key, mcp-session-id, Accept",
};

interface WeatherRequest {
  action: "get_forecast" | "get_current" | "get_settings" | "update_settings";
  latitude?: number;
  longitude?: number;
  location?: string;
  settings?: WeatherSettings;
}

interface WeatherSettings {
  default_location?: string;
  latitude?: number;
  longitude?: number;
  temperature_unit?: "celsius" | "fahrenheit";
  wind_speed_unit?: "kmh" | "mph" | "ms" | "kn";
  precipitation_unit?: "mm" | "inch";
  timezone?: string;
  include_current?: boolean;
  include_hourly?: boolean;
  include_daily?: boolean;
  hourly_hours?: number;
  daily_days?: number;
}

let identityTokenCache: { token: string; expiry: number } | null = null;
let mcpSessionId: string | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// JWT helpers
// ─────────────────────────────────────────────────────────────────────────────
function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemPkcs8ToDer(privateKeyPem: string): Uint8Array {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");
  const binary = atob(pemContents);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

// ─────────────────────────────────────────────────────────────────────────────
// Google identity token for Cloud Run
// ─────────────────────────────────────────────────────────────────────────────
async function getGoogleIdentityToken(targetAudience: string): Promise<string> {
  if (identityTokenCache && identityTokenCache.expiry > Date.now()) {
    return identityTokenCache.token;
  }

  const serviceAccountJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
  if (!serviceAccountJson) throw new Error("GOOGLE_SERVICE_ACCOUNT environment variable not set");

  let serviceAccount: any;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch {
    throw new Error("GOOGLE_SERVICE_ACCOUNT is not valid JSON");
  }

  if (!serviceAccount.private_key || !serviceAccount.client_email) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT missing private_key or client_email");
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
    kid: serviceAccount.private_key_id,
  };

  const claimSet = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp,
    target_audience: targetAudience, // must be Cloud Run URL origin
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaims = base64UrlEncode(JSON.stringify(claimSet));
  const signingInput = `${encodedHeader}.${encodedClaims}`;

  const der = pemPkcs8ToDer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuf = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );

  const signature = base64UrlEncodeBytes(new Uint8Array(sigBuf));
  const jwt = `${signingInput}.${signature}`;

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenResp.ok) {
    const errText = await tokenResp.text();
    console.error("[Auth] Token exchange failed:", tokenResp.status, errText);
    throw new Error(`Failed to get identity token: ${tokenResp.status} ${tokenResp.statusText}`);
  }

  const data = await tokenResp.json();
  const identityToken = data.id_token as string | undefined;
  if (!identityToken) throw new Error("Token exchange succeeded but id_token was missing");

  identityTokenCache = { token: identityToken, expiry: Date.now() + 55 * 60 * 1000 };
  return identityToken;
}

// ─────────────────────────────────────────────────────────────────────────────
// MCP calls
// ─────────────────────────────────────────────────────────────────────────────
type JsonRpcEnvelope<T> = { jsonrpc: "2.0"; id: number | string; result?: T; error?: any };

async function initializeMCPSession(
  mcpServerUrl: string,
  mcpApiKey: string,
  identityToken: string,
): Promise<string> {
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "weather-supabase-function", version: "1.0.0" },
    },
  };

  const resp = await fetch(`${mcpServerUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${identityToken}`,
      "x-weather-mcp-key": mcpApiKey.trim(),
    },
    body: JSON.stringify(initRequest),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`MCP initialization failed: ${resp.status} ${resp.statusText} — ${text}`);
  }

  const sessionId = resp.headers.get("mcp-session-id");
  if (!sessionId) {
    const text = await resp.text().catch(() => "");
    throw new Error(`No session ID returned from MCP server (missing mcp-session-id). Body: ${text}`);
  }

  return sessionId;
}

async function callMCPTool<T>(
  mcpServerUrl: string,
  mcpApiKey: string,
  identityToken: string,
  sessionId: string,
  toolName: string,
  args: Record<string, any>,
): Promise<JsonRpcEnvelope<T>> {
  const toolRequest = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };

  const resp = await fetch(`${mcpServerUrl}/mcp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": `Bearer ${identityToken}`,
      "x-weather-mcp-key": mcpApiKey.trim(),
      "mcp-session-id": sessionId,
    },
    body: JSON.stringify(toolRequest),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`MCP tool call failed: ${resp.status} ${resp.statusText} — ${text}`);
  }

  return (await resp.json()) as JsonRpcEnvelope<T>;
}

// Cached payload sanity checks
function looksLikeMcpErrorPayload(payload: any): boolean {
  // If someone cached an error string or an error-shaped object
  if (typeof payload === "string") return payload.trim().startsWith("Error:");
  if (payload && typeof payload === "object") {
    // common error markers
    if (payload.error) return true;
    if (payload.message && typeof payload.message === "string" && payload.message.includes("invalid_enum_value")) return true;
  }
  return false;
}

function looksLikeOpenMeteoPayload(payload: any): boolean {
  return (
    payload &&
    typeof payload === "object" &&
    typeof payload.latitude === "number" &&
    typeof payload.longitude === "number" &&
    (payload.current_weather || payload.hourly || payload.daily)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mcpServerUrl = (Deno.env.get("WEATHER_MCP_URL") || "").trim();
    const mcpApiKey = (Deno.env.get("WEATHER_MCP_KEY") || "").trim();
    if (!mcpServerUrl) throw new Error("WEATHER_MCP_URL environment variable is not configured");
    if (!mcpApiKey) throw new Error("WEATHER_MCP_KEY environment variable is not configured");

    const { action, latitude, longitude, settings }: WeatherRequest = await req.json();

    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── SETTINGS
    if (action === "get_settings" || action === "update_settings") {
      if (action === "get_settings") {
        const { data, error } = await supabase
          .from("weather_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;

        return new Response(JSON.stringify({ data: data || null }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (action === "update_settings" && settings) {
        const { data, error } = await supabase
          .from("weather_settings")
          .upsert({ user_id: user.id, ...settings }, { onConflict: "user_id" })
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify({ data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Invalid settings request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── WEATHER
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(JSON.stringify({ error: "Latitude and longitude are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const locationKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

    // Fetch user settings
    const { data: userSettings } = await supabase
      .from("weather_settings")
      .select("temperature_unit, wind_speed_unit, precipitation_unit, timezone")
      .eq("user_id", user.id)
      .maybeSingle();

    // Cache lookup
    const { data: cachedRow } = await supabase
      .from("weather_cache")
      .select("weather_data, expires_at")
      .eq("user_id", user.id)
      .eq("location_key", locationKey)
      .maybeSingle();

    // Use cache ONLY if it looks like real open-meteo payload (and not error junk)
    if (
      cachedRow &&
      new Date(cachedRow.expires_at) > new Date() &&
      looksLikeOpenMeteoPayload(cachedRow.weather_data) &&
      !looksLikeMcpErrorPayload(cachedRow.weather_data)
    ) {
      return new Response(JSON.stringify({ data: cachedRow.weather_data, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch fresh from MCP
    const targetAudience = new URL(mcpServerUrl).origin;
    const identityToken = await getGoogleIdentityToken(targetAudience);

    if (!mcpSessionId) {
      mcpSessionId = await initializeMCPSession(mcpServerUrl, mcpApiKey, identityToken);
    }

    const unitSettings = (userSettings ?? {}) as Partial<WeatherSettings>;

    const toolResp = await callMCPTool<any>(
      mcpServerUrl,
      mcpApiKey,
      identityToken,
      mcpSessionId,
      "weather_forecast",
      {
        latitude,
        longitude,
        current_weather: true,
        hourly: ["temperature_2m", "weather_code", "precipitation_probability", "relative_humidity_2m", "surface_pressure"],
        daily: ["temperature_2m_max", "temperature_2m_min", "weather_code", "precipitation_sum", "precipitation_probability_max"],

        // ✅ APPLY USER SETTINGS (Open-Meteo params)
        temperature_unit: unitSettings.temperature_unit === "fahrenheit" ? "fahrenheit" : "celsius",
        wind_speed_unit: unitSettings.wind_speed_unit,            // "kmh" | "mph" | "ms" | "kn"
        precipitation_unit: unitSettings.precipitation_unit,      // "mm" | "inch"
        timezone: unitSettings.timezone ?? "auto",
      },
    );

    const weatherPayload = toolResp.result ?? null;
    if (!weatherPayload) {
      throw new Error("MCP returned no result");
    }

    // Extra safety: don't cache error-like payloads
    if (looksLikeMcpErrorPayload(weatherPayload) || !looksLikeOpenMeteoPayload(weatherPayload)) {
      console.error("[MCP] Not caching payload (looks invalid):", weatherPayload);
      return new Response(JSON.stringify({ data: weatherPayload, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cache 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await supabase.from("weather_cache").upsert(
      {
        user_id: user.id,
        location_key: locationKey,
        weather_data: weatherPayload, // ✅ store open-meteo payload only
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "user_id,location_key" },
    );

    return new Response(JSON.stringify({ data: weatherPayload, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Weather MCP Error:", error);

    const msg = String(error?.message || "");
    const status =
      msg.includes("Unauthorized") ? 401 :
      msg.includes("Invalid API key") ? 403 :
      msg.includes("Forbidden") ? 403 :
      500;

    return new Response(JSON.stringify({ error: error?.message || "An error occurred" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

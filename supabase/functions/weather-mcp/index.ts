import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, Accept",
};

interface WeatherRequest {
  action:
    | "get_forecast"
    | "get_current"
    | "get_settings"
    | "update_settings"
    | "get_location_weather"
    | "prefetch_morning";
  latitude?: number;
  longitude?: number;
  location?: string;
  force?: boolean;
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
  // Basic display settings
  show_hourly_forecast?: boolean;
  show_wind?: boolean;
  show_humidity?: boolean;
  show_pressure?: boolean;
  // Temperature variants
  show_feels_like?: boolean;
  show_heat_index?: boolean;
  // Solar & Atmospheric
  show_uv_index?: boolean;
  show_cloud_cover?: boolean;
  show_thunderstorm_probability?: boolean;
  // Celestial events
  show_sun_events?: boolean;
  show_moon_events?: boolean;
  // Air quality
  show_air_quality?: boolean;
}

type JsonRpcEnvelope<T> = {
  jsonrpc: "2.0";
  id: number | string;
  result?: T;
  error?: any;
};

function unwrapMcpResult(payload: any): any {
  if (payload?.content && Array.isArray(payload.content) && payload.content[0]?.text) {
    const text = payload.content[0].text;
    if (typeof text === "string") {
      const t = text.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try { return JSON.parse(t); } catch { return payload; }
      }
    }
  }
  return payload;
}

function looksLikeErrorPayload(p: any): boolean {
  if (!p) return true;
  if (typeof p === "string") return p.trim().toLowerCase().startsWith("error");
  if (p.error) return true;
  if (p.message && typeof p.message === "string" && p.message.toLowerCase().includes("error")) return true;
  if (p.isError === true) return true;
  return false;
}

function toUnitsSystem(s: Partial<WeatherSettings>): "IMPERIAL" | "METRIC" {
  return s.temperature_unit === "fahrenheit" ? "IMPERIAL" : "METRIC";
}

function dateObj(d: Date) {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

// ─── Location-local "now" from longitude ─────────────────────────────────────
// Google's date param is relative to the location's local tz.  We approximate
// local date from longitude: every 15° ≈ 1 hour.  ±30 min error is fine for
// determining which calendar date it is at the location.
function locationDateNow(latitude: number, longitude: number): Date {
  const offsetHours = longitude / 15;
  const offsetMs    = offsetHours * 60 * 60 * 1000;
  const shifted     = new Date(Date.now() + offsetMs);
  // Return a Date whose wall-clock values (getFullYear etc.) equal the location's local date
  return new Date(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
    shifted.getUTCHours(),
    shifted.getUTCMinutes(),
  );
}

function deepFindKeys(obj: any, needles: string[], path = ""): string[] {
  const hits: string[] = [];
  if (!obj || typeof obj !== "object") return hits;
  const keys = Array.isArray(obj) ? obj.map((_: any, i: number) => String(i)) : Object.keys(obj);
  for (const k of keys) {
    const currentPath = path ? `${path}.${k}` : k;
    if (needles.some((n) => k.toLowerCase().includes(n.toLowerCase()))) hits.push(currentPath);
    if (obj[k] && typeof obj[k] === "object" && currentPath.split(".").length < 6)
      hits.push(...deepFindKeys(obj[k], needles, currentPath));
  }
  return hits;
}

// ─── MCP caller — graceful on 400 with valid JSON-RPC envelope ───────────────
async function callMcpTool<T>(
  baseUrl: string, apiKey: string, toolName: string, args: Record<string, any>,
): Promise<JsonRpcEnvelope<T>> {
  const resp = await fetch(baseUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0", id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  const text = await resp.text();
  let parsed: any;
  try { parsed = JSON.parse(text); } catch {
    if (!resp.ok) throw new Error(`MCP tool call failed: ${resp.status} — ${text.slice(0, 300)}`);
    throw new Error(`MCP tool call returned non-JSON: ${text.slice(0, 300)}`);
  }
  // Valid JSON-RPC envelope (even with isError) → return for caller to handle
  if (parsed && (parsed.jsonrpc || parsed.result !== undefined || parsed.error !== undefined))
    return parsed as JsonRpcEnvelope<T>;
  if (!resp.ok) throw new Error(`MCP tool call failed: ${resp.status} — ${text.slice(0, 300)}`);
  return { jsonrpc: "2.0", id: 0, result: parsed as T };
}

async function searchPlaceId(baseUrl: string, apiKey: string, query: string): Promise<string | null> {
  const env = await callMcpTool<any>(baseUrl, apiKey, "search_places", { textQuery: query });
  const r = unwrapMcpResult(env.result ?? null);
  if (!r || looksLikeErrorPayload(r)) return null;
  const candidates = r.places ?? r.results ?? r.candidates ?? r.placeResults ?? r.data?.places ?? [];
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const best = candidates[0];
  return best.placeId ?? best.place_id ?? best.id ?? best.name?.placeId ?? null;
}

function extractLatLngFromLookup(resp: any): { latitude: number; longitude: number } | null {
  const ll = resp?.returnedLocation?.latLng;
  if (typeof ll?.latitude === "number" && typeof ll?.longitude === "number")
    return { latitude: ll.latitude, longitude: ll.longitude };
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mcpKey = (Deno.env.get("weather_mcp_key") || "").trim();
    const mcpUrl = (Deno.env.get("weather_mcp_url") || "").trim();
    if (!mcpKey) throw new Error("weather_mcp_key not configured");
    if (!mcpUrl) throw new Error("weather_mcp_url not configured");

    const body: WeatherRequest = await req.json();
    const { action, latitude, longitude, location, force, settings } = body;
    console.log("[weather-mcp] ──── incoming request ────", JSON.stringify({ action, latitude, longitude, location, force }));

    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── Settings ──────────────────────────────────────────────────────────
    if (action === "get_settings" || action === "update_settings") {
      if (action === "get_settings") {
        const { data, error } = await supabase.from("weather_settings").select("*").eq("user_id", user.id).maybeSingle();
        if (error && (error as any).code !== "PGRST116") throw error;
        return new Response(JSON.stringify({ data: data || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (action === "update_settings" && settings) {
        // Cap values to reasonable limits
        const validatedSettings = {
          ...settings,
          hourly_hours: settings.hourly_hours ? Math.max(1, Math.min(24, settings.hourly_hours)) : undefined,
          daily_days: settings.daily_days ? Math.max(1, Math.min(7, settings.daily_days)) : undefined,
        };
        const { data, error } = await supabase.from("weather_settings")
          .upsert({ user_id: user.id, ...validatedSettings }, { onConflict: "user_id" }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "Invalid settings request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Location-based weather (by name) ──────────────────────────────────
    if (action === "get_location_weather") {
      if (!location || !location.trim()) {
        return new Response(JSON.stringify({ error: "location is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: userSettings } = await supabase.from("weather_settings").select("temperature_unit, wind_speed_unit").eq("user_id", user.id).maybeSingle();
      const unitsSystem = toUnitsSystem((userSettings ?? {}) as Partial<WeatherSettings>);
      const locationKey = `loc_${location.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "_")}_${user.id}_${unitsSystem}`;

      if (!force) {
        const { data: cachedRow } = await supabase.from("weather_cache").select("weather_data, expires_at").eq("user_id", user.id).eq("location_key", locationKey).maybeSingle();
        if (cachedRow && new Date((cachedRow as any).expires_at) > new Date() && (cachedRow as any).weather_data && !looksLikeErrorPayload((cachedRow as any).weather_data)) {
          console.log("[weather-mcp] get_location_weather → HIT cache");
          return new Response(JSON.stringify({ data: (cachedRow as any).weather_data, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }

      const placeId = await searchPlaceId(mcpUrl, mcpKey, location.trim());
      const locArg = placeId ? { placeId } : { address: location.trim() };
      const toolEnv = await callMcpTool<any>(mcpUrl, mcpKey, "lookup_weather", { unitsSystem, location: locArg });
      const wx = unwrapMcpResult(toolEnv.result ?? null);

      if (!wx || looksLikeErrorPayload(wx)) {
        return new Response(JSON.stringify({ error: "Weather data unavailable", data: null }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ll = extractLatLngFromLookup(wx);
      const result = {
        unitsSystem, location_label: location.trim(),
        returnedLocation: wx.returnedLocation ?? null,
        geocodedAddress: wx.DEPRECATEDGeocodedAddress ?? null,
        weatherCondition: wx.weatherCondition ?? null,
        precipitation: wx.precipitation ?? null,
        wind: wx.wind ?? null,
        temperature: wx.temperature ?? null,
        feelsLikeTemperature: wx.feelsLikeTemperature ?? null,
        heatIndex: wx.heatIndex ?? null,
        airPressure: wx.airPressure ?? null,
        relativeHumidity: wx.relativeHumidity ?? null,
        uvIndex: wx.uvIndex ?? null,
        thunderstormProbability: wx.thunderstormProbability ?? null,
        cloudCover: wx.cloudCover ?? null,
        sunEvents: wx.sunEvents ?? null,
        moonEvents: wx.moonEvents ?? null,
        latitude: ll?.latitude ?? null, longitude: ll?.longitude ?? null,
      };

      await supabase.from("weather_cache").upsert(
        { user_id: user.id, location_key: locationKey, weather_data: result, expires_at: new Date(Date.now() + 6*60*60*1000).toISOString() },
        { onConflict: "user_id,location_key" },
      );
      return new Response(JSON.stringify({ data: result, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Morning prefetch ──────────────────────────────────────────────────
    if (action === "prefetch_morning") {
      const { data: userSettings } = await supabase.from("weather_settings").select("*").eq("user_id", user.id).maybeSingle();
      const us = (userSettings || {}) as any;
      const lat = us.latitude ?? latitude;
      const lng = us.longitude ?? longitude;
      if (typeof lat !== "number" || typeof lng !== "number") {
        return new Response(JSON.stringify({ error: "No default location configured" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const unitsSystem = toUnitsSystem(us as Partial<WeatherSettings>);
      const locationKey = `morning_${lat.toFixed(4)}_${lng.toFixed(4)}_${unitsSystem}`;
      const { data: cachedRow } = await supabase.from("weather_cache").select("weather_data, expires_at").eq("user_id", user.id).eq("location_key", locationKey).maybeSingle();
      const now = new Date();
      const sixAMTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0, 0);

      if (cachedRow && new Date((cachedRow as any).expires_at) >= sixAMTomorrow && (cachedRow as any).weather_data && !looksLikeErrorPayload((cachedRow as any).weather_data)) {
        return new Response(JSON.stringify({ data: (cachedRow as any).weather_data, cached: true, prefetched: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const todayEnv = await callMcpTool<any>(mcpUrl, mcpKey, "lookup_weather", { unitsSystem, location: { latLng: { latitude: lat, longitude: lng } }, date: dateObj(now) });
      const todayWx = unwrapMcpResult(todayEnv.result ?? null);
      if (!todayWx || looksLikeErrorPayload(todayWx)) {
        return new Response(JSON.stringify({ error: "Weather data unavailable for prefetch", data: null, cached: false, prefetched: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const payload = { unitsSystem, current: todayWx, daily: [{ date: dateObj(now), response: todayWx }] };
      await supabase.from("weather_cache").upsert(
        { user_id: user.id, location_key: locationKey, weather_data: payload, expires_at: sixAMTomorrow.toISOString() },
        { onConflict: "user_id,location_key" },
      );
      return new Response(JSON.stringify({ data: payload, cached: false, prefetched: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Validate action ───────────────────────────────────────────────────
    if (action !== "get_current" && action !== "get_forecast") {
      return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(JSON.stringify({ error: "Latitude and longitude are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Shared setup ──────────────────────────────────────────────────────
    const { data: userSettings } = await supabase.from("weather_settings")
      .select("temperature_unit, wind_speed_unit, precipitation_unit, timezone, daily_days").eq("user_id", user.id).maybeSingle();
    const unitsSystem = toUnitsSystem((userSettings ?? {}) as Partial<WeatherSettings>);
    const dailyDays  = Math.max(1, Math.min(7, Number((userSettings as any)?.daily_days ?? 7)));
    const locationKeyBase = `latlng_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${unitsSystem}_${action}_${dailyDays}`;

    if (!force) {
      const { data: cachedRow } = await supabase.from("weather_cache").select("weather_data, expires_at").eq("user_id", user.id).eq("location_key", locationKeyBase).maybeSingle();
      if (cachedRow && new Date((cachedRow as any).expires_at) > new Date() && (cachedRow as any).weather_data && !looksLikeErrorPayload((cachedRow as any).weather_data)) {
        console.log(`[weather-mcp] ${action} → HIT cache`);
        return new Response(JSON.stringify({ data: (cachedRow as any).weather_data, cached: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      console.log(`[weather-mcp] ${action} → MISS cache`);
    } else {
      console.log(`[weather-mcp] ${action} → force=true`);
    }

    // ─── get_current ───────────────────────────────────────────────────────
    if (action === "get_current") {
      const env = await callMcpTool<any>(mcpUrl, mcpKey, "lookup_weather", { unitsSystem, location: { latLng: { latitude, longitude } } });
      const wx = unwrapMcpResult(env.result ?? null);
      if (!wx || looksLikeErrorPayload(wx)) {
        return new Response(JSON.stringify({ error: "Weather data unavailable", data: null, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("weather_cache").upsert(
        { user_id: user.id, location_key: locationKeyBase, weather_data: wx, expires_at: new Date(Date.now() + 60*60*1000).toISOString() },
        { onConflict: "user_id,location_key" },
      );
      return new Response(JSON.stringify({ data: wx, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── get_forecast ──────────────────────────────────────────────────────
    // STEP 1: undated call → current observation (temperature, wind, humidity,
    //         pressure — the fields the detail pills need).  Also gives us the
    //         canonical location for step 2.
    console.log("[weather-mcp] get_forecast → step 1: fetching current observation");
    let currentData: any = null;
    let locationLat = latitude;
    let locationLng = longitude;

    try {
      const currentEnv = await callMcpTool<any>(mcpUrl, mcpKey, "lookup_weather", {
        unitsSystem,
        location: { latLng: { latitude, longitude } },
        // NO date / hour → current observation
      });
      const currentWx = unwrapMcpResult(currentEnv.result ?? null);
      if (currentWx && !looksLikeErrorPayload(currentWx)) {
        currentData = currentWx;
        console.log("[weather-mcp] get_forecast → current obs keys:", Object.keys(currentWx));
        const ll = extractLatLngFromLookup(currentWx);
        if (ll) { locationLat = ll.latitude; locationLng = ll.longitude; }
      } else {
        console.warn("[weather-mcp] get_forecast → current obs: error/empty");
      }
    } catch (err: any) {
      console.warn(`[weather-mcp] get_forecast → current obs threw: ${err?.message ?? err}`);
    }

    // STEP 2: compute location-local "today" from longitude
    const locationToday = locationDateNow(locationLat, locationLng);
    console.log(`[weather-mcp] get_forecast → location today: ${locationToday.getFullYear()}-${String(locationToday.getMonth()+1).padStart(2,'0')}-${String(locationToday.getDate()).padStart(2,'0')}`);

    // STEP 3: daily loop.  Request up to dailyDays+1 but keep only dailyDays results.
    console.log(`[weather-mcp] get_forecast → step 3: daily loop (target=${dailyDays})`);
    const daily: any[] = [];

    for (let i = 0; i < dailyDays + 1; i++) {
      if (daily.length >= dailyDays) break;   // got enough

      const d      = addDays(locationToday, i);
      const dateArg = dateObj(d);
      console.log(`[weather-mcp] get_forecast → Day +${i} | date: ${JSON.stringify(dateArg)}`);

      try {
        const env = await callMcpTool<any>(mcpUrl, mcpKey, "lookup_weather", {
          unitsSystem,
          location: { latLng: { latitude: locationLat, longitude: locationLng } },
          date: dateArg,
        });
        const wx = unwrapMcpResult(env.result ?? null);
        if (!wx || looksLikeErrorPayload(wx)) {
          console.warn(`[weather-mcp] get_forecast → Day +${i} | error payload, skipping`);
          continue;
        }
        daily.push({ date: dateArg, response: wx });
        console.log(`[weather-mcp] get_forecast → Day +${i} | ✓ (${daily.length}/${dailyDays})`);
      } catch (err: any) {
        console.warn(`[weather-mcp] get_forecast → Day +${i} | threw: ${err?.message ?? err}`);
      }
    }

    console.log(`[weather-mcp] get_forecast → loop done | ${daily.length}/${dailyDays} days`);

    if (daily.length === 0) {
      return new Response(JSON.stringify({ error: "No forecast days could be fetched", data: null, cached: false }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If undated call failed, fall back to daily[0] so current is never null
    if (!currentData) {
      console.log("[weather-mcp] get_forecast → falling back current → daily[0]");
      currentData = daily[0]?.response ?? null;
    }

    const aggregated = {
      unitsSystem,
      current: currentData,   // ← undated observation: has wind, humidity, pressure, real temp
      daily,                  // ← dated daily summaries: max/min temps
      hourly: null,           // MCP has no hourly; frontend synthesises from daily min/max
    };

    console.log("[weather-mcp] get_forecast → aggregated:", JSON.stringify({
      dailyCount: daily.length,
      currentKeys: currentData ? Object.keys(currentData) : null,
      dailyDates: daily.map((d: any) => d.date),
    }));

    await supabase.from("weather_cache").upsert(
      { user_id: user.id, location_key: locationKeyBase, weather_data: aggregated, expires_at: new Date(Date.now() + 60*60*1000).toISOString() },
      { onConflict: "user_id,location_key" },
    );
    return new Response(JSON.stringify({ data: aggregated, cached: false }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: any) {
    const msg = String(error?.message || "");
    console.error("[weather-mcp] ──── UNHANDLED ERROR ────", msg);
    const status = msg.includes("Unauthorized") ? 401 : msg.includes("Invalid API key") || msg.includes("Forbidden") ? 403 : 500;
    return new Response(JSON.stringify({ error: msg || "An error occurred" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
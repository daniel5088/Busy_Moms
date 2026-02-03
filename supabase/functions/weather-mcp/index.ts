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
}

type JsonRpcEnvelope<T> = { jsonrpc: "2.0"; id: number | string; result?: T; error?: any };

function unwrapMcpResult(payload: any): any {
  if (payload?.content && Array.isArray(payload.content) && payload.content[0]?.text) {
    const text = payload.content[0].text;
    if (typeof text === "string") {
      const t = text.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        try {
          return JSON.parse(t);
        } catch {
          return payload;
        }
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
  return false;
}

function toUnitsSystem(s: Partial<WeatherSettings>): "IMPERIAL" | "METRIC" {
  return s.temperature_unit === "fahrenheit" ? "IMPERIAL" : "METRIC";
}

function dateObj(d: Date) {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

async function callMcpTool<T>(
  mcpUrl: string,
  apiKey: string,
  toolName: string,
  args: Record<string, any>,
): Promise<JsonRpcEnvelope<T>> {
  const resp = await fetch(mcpUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json, text/event-stream",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });
  if (!resp.ok) throw new Error(`MCP tool call failed: ${resp.status} — ${await resp.text()}`);
  return (await resp.json()) as JsonRpcEnvelope<T>;
}

async function searchPlaceId(mcpUrl: string, apiKey: string, query: string): Promise<string | null> {
  const env = await callMcpTool<any>(mcpUrl, apiKey, "search_places", { textQuery: query });
  const r = unwrapMcpResult(env.result ?? null);
  if (!r || looksLikeErrorPayload(r)) return null;

  const candidates =
    r.places ??
    r.results ??
    r.candidates ??
    r.placeResults ??
    r.data?.places ??
    [];

  if (!Array.isArray(candidates) || candidates.length === 0) return null;

  const best = candidates[0];
  return (
    best.placeId ??
    best.place_id ??
    best.id ??
    best.name?.placeId ??
    null
  );
}

function extractLatLngFromLookup(resp: any): { latitude: number; longitude: number } | null {
  const rl = resp?.returnedLocation;
  const ll = rl?.latLng;
  const lat = ll?.latitude;
  const lng = ll?.longitude;
  if (typeof lat === "number" && typeof lng === "number") return { latitude: lat, longitude: lng };
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const weatherMcpUrl = (Deno.env.get("WEATHER_MCP_URL") || "").trim();
    const weatherMcpKey = (Deno.env.get("WEATHER_MCP_KEY") || "").trim();
    if (!weatherMcpUrl) throw new Error("WEATHER_MCP_URL not configured");
    if (!weatherMcpKey) throw new Error("WEATHER_MCP_KEY not configured");

    const body: WeatherRequest = await req.json();
    const { action, latitude, longitude, location, force, settings } = body;

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

    if (action === "get_settings" || action === "update_settings") {
      if (action === "get_settings") {
        const { data, error } = await supabase
          .from("weather_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error && (error as any).code !== "PGRST116") throw error;
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

    if (action === "get_location_weather") {
      if (!location || !location.trim()) {
        return new Response(JSON.stringify({ error: "location is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: userSettings } = await supabase
        .from("weather_settings")
        .select("temperature_unit, wind_speed_unit")
        .eq("user_id", user.id)
        .maybeSingle();

      const unitSettings = (userSettings ?? {}) as Partial<WeatherSettings>;
      const unitsSystem = toUnitsSystem(unitSettings);

      const locationKey = `loc_${location.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "_")}_${user.id}_${unitsSystem}`;

      if (!force) {
        const { data: cachedRow } = await supabase
          .from("weather_cache")
          .select("weather_data, expires_at")
          .eq("user_id", user.id)
          .eq("location_key", locationKey)
          .maybeSingle();

        if (
          cachedRow &&
          new Date((cachedRow as any).expires_at) > new Date() &&
          (cachedRow as any).weather_data &&
          !looksLikeErrorPayload((cachedRow as any).weather_data)
        ) {
          return new Response(JSON.stringify({ data: (cachedRow as any).weather_data, cached: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      const placeId = await searchPlaceId(weatherMcpUrl, weatherMcpKey, location.trim());
      const locArg = placeId ? { placeId } : { address: location.trim() };

      const toolEnv = await callMcpTool<any>(weatherMcpUrl, weatherMcpKey, "lookup_weather", {
        unitsSystem,
        location: locArg,
      });

      const wx = unwrapMcpResult(toolEnv.result ?? null);
      if (!wx || looksLikeErrorPayload(wx)) {
        return new Response(JSON.stringify({ error: "Weather data unavailable", data: null }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ll = extractLatLngFromLookup(wx);

      const result = {
        unitsSystem,
        location_label: location.trim(),
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
        latitude: ll?.latitude ?? null,
        longitude: ll?.longitude ?? null,
      };

      const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
      await supabase.from("weather_cache").upsert(
        {
          user_id: user.id,
          location_key: locationKey,
          weather_data: result,
          expires_at: expiresAt.toISOString(),
        },
        { onConflict: "user_id,location_key" },
      );

      return new Response(JSON.stringify({ data: result, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "prefetch_morning") {
      const { data: userSettings } = await supabase
        .from("weather_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      const us = (userSettings || {}) as any;
      const lat = us.latitude ?? latitude;
      const lng = us.longitude ?? longitude;

      if (typeof lat !== "number" || typeof lng !== "number") {
        return new Response(JSON.stringify({ error: "No default location configured" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const unitsSystem = toUnitsSystem(us as Partial<WeatherSettings>);
      const locationKey = `morning_${lat.toFixed(4)}_${lng.toFixed(4)}_${unitsSystem}`;

      const { data: cachedRow } = await supabase
        .from("weather_cache")
        .select("weather_data, expires_at")
        .eq("user_id", user.id)
        .eq("location_key", locationKey)
        .maybeSingle();

      const now = new Date();
      const sixAMTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 6, 0, 0);

      if (
        cachedRow &&
        new Date((cachedRow as any).expires_at) >= sixAMTomorrow &&
        (cachedRow as any).weather_data &&
        !looksLikeErrorPayload((cachedRow as any).weather_data)
      ) {
        return new Response(JSON.stringify({ data: (cachedRow as any).weather_data, cached: true, prefetched: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const todayEnv = await callMcpTool<any>(weatherMcpUrl, weatherMcpKey, "lookup_weather", {
        unitsSystem,
        location: { latLng: { latitude: lat, longitude: lng } },
        date: dateObj(now),
      });

      const todayWx = unwrapMcpResult(todayEnv.result ?? null);
      if (!todayWx || looksLikeErrorPayload(todayWx)) {
        return new Response(JSON.stringify({ data: todayWx ?? null, cached: false, prefetched: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const payload = {
        unitsSystem,
        current: todayWx,
        daily: [{ date: dateObj(now), response: todayWx }],
      };

      await supabase.from("weather_cache").upsert(
        {
          user_id: user.id,
          location_key: locationKey,
          weather_data: payload,
          expires_at: sixAMTomorrow.toISOString(),
        },
        { onConflict: "user_id,location_key" },
      );

      return new Response(JSON.stringify({ data: payload, cached: false, prefetched: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action !== "get_current" && action !== "get_forecast") {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return new Response(JSON.stringify({ error: "Latitude and longitude are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userSettings } = await supabase
      .from("weather_settings")
      .select("temperature_unit, wind_speed_unit, precipitation_unit, timezone, daily_days")
      .eq("user_id", user.id)
      .maybeSingle();

    const unitSettings = (userSettings ?? {}) as Partial<WeatherSettings>;
    const unitsSystem = toUnitsSystem(unitSettings);
    const dailyDays = Math.max(1, Math.min(7, Number((userSettings as any)?.daily_days ?? 7)));

    const locationKeyBase = `latlng_${latitude.toFixed(4)}_${longitude.toFixed(4)}_${unitsSystem}_${action}_${dailyDays}`;

    if (!force) {
      const { data: cachedRow } = await supabase
        .from("weather_cache")
        .select("weather_data, expires_at")
        .eq("user_id", user.id)
        .eq("location_key", locationKeyBase)
        .maybeSingle();

      if (
        cachedRow &&
        new Date((cachedRow as any).expires_at) > new Date() &&
        (cachedRow as any).weather_data &&
        !looksLikeErrorPayload((cachedRow as any).weather_data)
      ) {
        return new Response(JSON.stringify({ data: (cachedRow as any).weather_data, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (action === "get_current") {
      const env = await callMcpTool<any>(weatherMcpUrl, weatherMcpKey, "lookup_weather", {
        unitsSystem,
        location: { latLng: { latitude, longitude } },
      });

      const wx = unwrapMcpResult(env.result ?? null);
      if (!wx || looksLikeErrorPayload(wx)) {
        return new Response(JSON.stringify({ data: wx ?? null, cached: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await supabase.from("weather_cache").upsert(
        { user_id: user.id, location_key: locationKeyBase, weather_data: wx, expires_at: expiresAt.toISOString() },
        { onConflict: "user_id,location_key" },
      );

      return new Response(JSON.stringify({ data: wx, cached: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date();
    const daily: any[] = [];

    for (let i = 0; i < dailyDays; i++) {
      const d = addDays(today, i);
      const env = await callMcpTool<any>(weatherMcpUrl, weatherMcpKey, "lookup_weather", {
        unitsSystem,
        location: { latLng: { latitude, longitude } },
        date: dateObj(d),
      });
      const wx = unwrapMcpResult(env.result ?? null);
      if (!wx || looksLikeErrorPayload(wx)) {
        return new Response(JSON.stringify({ data: wx ?? null, cached: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      daily.push({ date: dateObj(d), response: wx });
    }

    const aggregated = {
      unitsSystem,
      current: daily[0]?.response ?? null,
      daily,
    };

    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await supabase.from("weather_cache").upsert(
      { user_id: user.id, location_key: locationKeyBase, weather_data: aggregated, expires_at: expiresAt.toISOString() },
      { onConflict: "user_id,location_key" },
    );

    return new Response(JSON.stringify({ data: aggregated, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    const msg = String(error?.message || "");
    const status = msg.includes("Unauthorized")
      ? 401
      : msg.includes("Invalid API key") || msg.includes("Forbidden")
        ? 403
        : 500;

    return new Response(JSON.stringify({ error: msg || "An error occurred" }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

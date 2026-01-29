import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WeatherRequest {
  action: 'get_forecast' | 'get_current' | 'get_settings' | 'update_settings';
  latitude?: number;
  longitude?: number;
  location?: string;
  settings?: WeatherSettings;
}

interface WeatherSettings {
  default_location?: string;
  latitude?: number;
  longitude?: number;
  temperature_unit?: 'celsius' | 'fahrenheit';
  wind_speed_unit?: 'kmh' | 'mph' | 'ms' | 'kn';
  precipitation_unit?: 'mm' | 'inch';
  timezone?: string;
  include_current?: boolean;
  include_hourly?: boolean;
  include_daily?: boolean;
  hourly_hours?: number;
  daily_days?: number;
}

interface MCPRequest {
  method: string;
  params: {
    name: string;
    arguments: Record<string, any>;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Get MCP server URL from environment
    const mcpServerUrl = Deno.env.get("MCP_SERVER_URL") || "http://localhost:3000";

    const { action, latitude, longitude, location, settings }: WeatherRequest = await req.json();

    // Handle settings operations
    if (action === 'get_settings' || action === 'update_settings') {
      const { createClient } = await import('jsr:@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Get user ID from auth token
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        throw new Error('Unauthorized');
      }

      if (action === 'get_settings') {
        const { data, error } = await supabase
          .from('weather_settings')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return new Response(
          JSON.stringify({ data: data || null }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      if (action === 'update_settings' && settings) {
        const { data, error } = await supabase
          .from('weather_settings')
          .upsert({
            user_id: user.id,
            ...settings,
          }, {
            onConflict: 'user_id'
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return new Response(
          JSON.stringify({ data }),
          {
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Validate coordinates
    if (!latitude || !longitude) {
      throw new Error('Latitude and longitude are required for weather data');
    }

    // Check cache first
    const { createClient } = await import('jsr:@supabase/supabase-js@2');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const locationKey = `${latitude.toFixed(2)}_${longitude.toFixed(2)}`;

    const { data: cachedData } = await supabase
      .from('weather_cache')
      .select('weather_data, expires_at')
      .eq('user_id', user.id)
      .eq('location_key', locationKey)
      .maybeSingle();

    // Return cached data if still valid
    if (cachedData && new Date(cachedData.expires_at) > new Date()) {
      return new Response(
        JSON.stringify({
          data: cachedData.weather_data,
          cached: true
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Call MCP server to get weather data
    const mcpRequest: MCPRequest = {
      method: 'tools/call',
      params: {
        name: action === 'get_current' ? 'get-current-weather' : 'get-forecast',
        arguments: {
          latitude,
          longitude,
          // Add any additional parameters based on user settings
        },
      },
    };

    const mcpResponse = await fetch(`${mcpServerUrl}/mcp/v1/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mcpRequest),
    });

    if (!mcpResponse.ok) {
      throw new Error(`MCP server error: ${mcpResponse.statusText}`);
    }

    const weatherData = await mcpResponse.json();

    // Cache the result (1 hour expiry)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await supabase
      .from('weather_cache')
      .upsert({
        user_id: user.id,
        location_key: locationKey,
        weather_data: weatherData,
        expires_at: expiresAt.toISOString(),
      }, {
        onConflict: 'user_id,location_key'
      });

    return new Response(
      JSON.stringify({
        data: weatherData,
        cached: false
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );

  } catch (error) {
    console.error('Weather MCP Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'An error occurred while fetching weather data'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

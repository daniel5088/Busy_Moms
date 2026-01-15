const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { input } = await req.json();
    if (!input || typeof input !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid input parameter' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    url.searchParams.set('input', input);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
      return new Response(
        JSON.stringify({
          predictions: data.predictions || [],
          status: data.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } else {
      console.error('Google Places API error:', data);
      return new Response(
        JSON.stringify({
          error: 'Places API error',
          status: data.status,
          predictions: []
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        predictions: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

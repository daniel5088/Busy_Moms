// supabase/functions/instacart-get-retailers/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

declare const Deno: any;

const INSTACART_API_KEY = Deno.env.get('INSTACART_API_KEY');

const INSTACART_ENV = Deno.env.get('INSTACART_ENV') || 'development';
const INSTACART_BASE_URL =
  INSTACART_ENV === 'production'
    ? 'https://connect.instacart.com'
    : 'https://connect.dev.instacart.tools';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-correlation-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function getCorrelationId(req: Request) {
  return (
    req.headers.get('x-correlation-id') ||
    req.headers.get('X-Correlation-ID') ||
    crypto.randomUUID()
  );
}

Deno.serve(async (req: Request) => {
  const correlationId = getCorrelationId(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        ...corsHeaders,
        'x-correlation-id': correlationId,
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'x-correlation-id': correlationId,
      },
    });
  }

  try {
    if (!INSTACART_API_KEY) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'INSTACART_API_KEY is not set',
          correlationId,
        })
      );
      return new Response(
        JSON.stringify({ error: 'Missing INSTACART_API_KEY' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        }
      );
    }

    const body = await req.json();
    const postalCode = body?.postal_code || '33328';
    const countryCode = (body?.country_code || 'US').toUpperCase();

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Getting nearby retailers',
        correlationId,
        postalCode,
        countryCode,
        environment: INSTACART_ENV,
      })
    );

    if (!['US', 'CA'].includes(countryCode)) {
      return new Response(
        JSON.stringify({ error: 'country_code must be US or CA' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        }
      );
    }

    const params = new URLSearchParams({
      postal_code: postalCode,
      country_code: countryCode,
    });

    const apiUrl = `${INSTACART_BASE_URL}/idp/v1/retailers?${params.toString()}`;

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Calling Instacart REST API',
        correlationId,
        url: apiUrl,
      })
    );

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${INSTACART_API_KEY}`,
      },
    });

    const responseText = await response.text();

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Instacart API response',
        correlationId,
        status: response.status,
        responsePreview: responseText.substring(0, 200),
      })
    );

    if (!response.ok) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'Failed to get retailers from Instacart',
          correlationId,
          status: response.status,
          response: responseText,
        })
      );

      return new Response(
        JSON.stringify({
          error: 'Failed to get retailers',
          status: response.status,
          details: responseText,
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        }
      );
    }

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'Failed to parse Instacart response',
          correlationId,
          error: parseError instanceof Error ? parseError.message : String(parseError),
          response: responseText,
        })
      );

      return new Response(
        JSON.stringify({
          error: 'Invalid JSON response from Instacart',
          details: responseText,
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        }
      );
    }

    const retailers = data.retailers || [];

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Successfully retrieved retailers',
        correlationId,
        retailerCount: retailers.length,
      })
    );

    return new Response(
      JSON.stringify({
        retailers,
        postal_code: postalCode,
        country_code: countryCode,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      }
    );
  } catch (err: any) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'Unexpected error in instacart-get-retailers',
        correlationId,
        error: err?.message ?? String(err),
        stack: err?.stack,
      })
    );

    return new Response(
      JSON.stringify({
        error: err?.message || 'Unexpected error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      }
    );
  }
});
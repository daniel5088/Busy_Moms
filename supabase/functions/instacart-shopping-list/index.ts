// supabase/functions/instacart-shopping-list/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey, x-correlation-id',
};

interface InstacartShoppingListItem {
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
}

interface CreateShoppingListRequest {
  items: InstacartShoppingListItem[];
  title?: string;
  // Accept retailer_key from the client for preference tracking only.
  // Do NOT forward retailer_key to Instacart Connect products_link.
  retailer_key?: string;
}

interface InstacartShoppingListResponse {
  products_link_url: string;
}

interface GetNearbyRetailersRequest {
  postal_code: string;
  country_code: string;
}

interface Retailer {
  retailer_key: string;
  name: string;
  retailer_logo_url: string;
}

interface GetNearbyRetailersResponse {
  retailers: Retailer[];
}

function json(body: unknown, status: number, correlationId: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'x-correlation-id': correlationId,
    },
  });
}

Deno.serve(async (req: Request) => {
  const incomingId = req.headers.get('x-correlation-id');
  const correlationId = incomingId ?? crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: { ...corsHeaders, 'x-correlation-id': correlationId },
    });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, correlationId);
  }

  try {
    const instacartApiKey = Deno.env.get('INSTACART_API_KEY');
    if (!instacartApiKey) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'INSTACART_API_KEY missing',
          correlationId,
        }),
      );
      return json(
        { error: 'INSTACART_API_KEY environment variable is not set' },
        500,
        correlationId,
      );
    }

    // 🔹 Env switch
    const instacartEnv = Deno.env.get('INSTACART_ENV') || 'development';
    const instacartBaseUrl =
      instacartEnv === 'production'
        ? 'https://connect.instacart.com'
        : 'https://connect.dev.instacart.tools';

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Instacart environment',
        correlationId,
        environment: instacartEnv,
        baseUrl: instacartBaseUrl,
      }),
    );

    const body = await req.json();
    const action = body?.action;
    const payload = body ?? {};

    if (action === 'ping') {
      return json(
        {
          ok: true,
          source: 'instacart-shopping-list',
          environment: instacartEnv,
        },
        200,
        correlationId,
      );
    }

    switch (action) {
      case 'create_shopping_list': {
        const listRequest: CreateShoppingListRequest = payload;

        if (!listRequest.items || listRequest.items.length === 0) {
          return json({ error: 'At least one item is required' }, 400, correlationId);
        }

        const line_items = listRequest.items.map((item) => {
          const li: Record<string, unknown> = {
            name: String(item.name ?? '').trim(),
          };

          if (!li.name) li.name = 'item';

          if (typeof item.quantity === 'number' && item.quantity > 0) {
            li.quantity = item.quantity;
          }

          if (typeof item.unit === 'string' && item.unit.trim().length > 0) {
            li.unit = item.unit.trim();
          }

          return li;
        });

        // Build final payload for Instacart Connect products_link. Note: retailer_key is intentionally excluded.
        const instacartPayload = {
          title: listRequest.title || 'Shopping List',
          line_items,
        };

        const endpoint = `${instacartBaseUrl}/idp/v1/products/products_link`;

        console.log(
          JSON.stringify({
            level: 'info',
            msg: 'Calling Instacart create_shopping_list',
            correlationId,
            endpoint,
            payload: instacartPayload,
          }),
        );

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${instacartApiKey}`,
          },
          body: JSON.stringify(instacartPayload),
        });

        const contentType = response.headers.get('content-type');
        const responseText = await response.text();

        console.log(
          JSON.stringify({
            level: 'info',
            msg: 'Instacart create_shopping_list raw response',
            correlationId,
            status: response.status,
            contentType,
            responseText,
          }),
        );

        let responseData: any;
        try {
          responseData =
            contentType?.includes('application/json') && responseText
              ? JSON.parse(responseText)
              : { raw: responseText };
        } catch {
          responseData = { raw: responseText };
        }

        if (!response.ok) {
          console.error(
            JSON.stringify({
              level: 'error',
              msg: 'Instacart API error (create_shopping_list)',
              correlationId,
              status: response.status,
              endpoint,
              details: responseData,
            }),
          );
          return json(
            {
              error: 'Failed to create Instacart shopping list',
              status: response.status,
              details: responseData,
            },
            response.status,
            correlationId,
          );
        }

        const link = (responseData as InstacartShoppingListResponse)
          .products_link_url;

        return json(
          {
            status: 'success',
            instacart_list_url: link,
            products_link_url: link,
          },
          200,
          correlationId,
        );
      }

      case 'get_nearby_retailers': {
        const retailerRequest: GetNearbyRetailersRequest = payload;

        if (!retailerRequest.postal_code || !retailerRequest.country_code) {
          return json(
            { error: 'postal_code and country_code are required' },
            400,
            correlationId,
          );
        }

        const cc = retailerRequest.country_code.toUpperCase();
        if (!['US', 'CA'].includes(cc)) {
          return json(
            { error: "country_code must be 'US' or 'CA'" },
            400,
            correlationId,
          );
        }

        const params = new URLSearchParams({
          postal_code: retailerRequest.postal_code,
          country_code: cc,
        });

        const apiUrl = `${instacartBaseUrl}/idp/v1/retailers?${params.toString()}`;

        console.log(
          JSON.stringify({
            level: 'info',
            msg: 'Calling Instacart Connect API: retailers',
            correlationId,
            apiUrl,
          }),
        );

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${instacartApiKey}`,
          },
        });

        const contentType = response.headers.get('content-type');
        const responseText = await response.text();

        let responseData: any;
        try {
          responseData =
            contentType?.includes('application/json') && responseText
              ? JSON.parse(responseText)
              : { raw: responseText };
        } catch {
          responseData = { raw: responseText };
        }

        if (!response.ok) {
          console.error(
            JSON.stringify({
              level: 'error',
              msg: 'Instacart Connect API error (retailers)',
              correlationId,
              status: response.status,
              details: responseData,
            }),
          );

          return json(
            {
              error: 'Failed to get nearby retailers',
              status: response.status,
              details: responseData,
              endpoint: apiUrl,
            },
            response.status,
            correlationId,
          );
        }

        return json(responseData as GetNearbyRetailersResponse, 200, correlationId);
      }

      default:
        return json(
          {
            error:
              'Invalid action. Supported actions: create_shopping_list, get_nearby_retailers, ping',
          },
          400,
          correlationId,
        );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'Edge function error',
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      }),
    );

    return json(
      {
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      500,
      correlationId,
    );
  }
});

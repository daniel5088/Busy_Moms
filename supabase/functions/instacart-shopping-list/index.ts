// supabase/functions/instacart-shopping-list/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Client-Info, Apikey, x-correlation-id',
};

interface CreateShoppingListRequest {
  // Either a list of items...
  items?: Array<{ name: string; quantity?: number; unit?: string }>;
  // ...or a natural-language sentence:
  shoppingSentence?: string;
  title?: string;
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

    const instacartEnv = Deno.env.get('INSTACART_ENV') || 'development';
    const instacartBaseUrl =
      instacartEnv === 'production'
        ? 'https://connect.instacart.com'
        : 'https://connect.dev.instacart.tools';

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
      /**
       * create_shopping_list
       *
       * This now delegates to the instacart-agent MCP function to keep all
       * MCP logic in a single place. You can still call this from your app
       * if you have existing code that expects the old shape.
       */
      case 'create_shopping_list': {
        const reqBody: CreateShoppingListRequest = payload;

        // If the caller passed a natural-language sentence, send that
        if (reqBody.shoppingSentence && typeof reqBody.shoppingSentence === 'string') {
          // Call the instacart-agent function with tool = create-shopping-list
          const agentUrl = new URL(req.url);
          // Replace current path with instacart-agent (works on Supabase Edge)
          const instacartAgentUrl = agentUrl.href.replace(
            /\/instacart-shopping-list(\/)?$/,
            '/instacart-agent',
          );

          console.log(
            JSON.stringify({
              level: 'info',
              msg: 'Delegating to instacart-agent (MCP)',
              correlationId,
              instacartAgentUrl,
            }),
          );

          const res = await fetch(instacartAgentUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-correlation-id': correlationId,
              Authorization: req.headers.get('Authorization') ?? '',
              apikey: req.headers.get('apikey') ?? '',
            },
            body: JSON.stringify({
              shoppingSentence: reqBody.shoppingSentence,
              tool: 'create-shopping-list',
            }),
          });

          const text = await res.text();
          let data: any;
          try {
            data = text ? JSON.parse(text) : {};
          } catch {
            data = { raw: text };
          }

          if (!res.ok || data?.status === 'error') {
            return json(
              {
                error: 'instacart-agent failed to create shopping list',
                http_status: res.status,
                details: data,
              },
              500,
              correlationId,
            );
          }

          // Pass through MCP agent response shape
          return json(data, 200, correlationId);
        }

        // If they passed an explicit items array, keep the old Connect behavior.
        const listItems = Array.isArray(reqBody.items) ? reqBody.items : [];
        if (!listItems.length) {
          return json(
            {
              error:
                'Either shoppingSentence or a non-empty items array is required',
            },
            400,
            correlationId,
          );
        }

        const line_items = listItems.map((item) => {
          const li: any = { name: String(item.name ?? '').trim() || 'item' };
          if (typeof item.quantity === 'number' && item.quantity > 0) {
            li.quantity = item.quantity;
          }
          if (typeof item.unit === 'string' && item.unit.trim().length > 0) {
            li.unit = item.unit.trim();
          }
          return li;
        });

        const connectPayload = {
          title: reqBody.title || 'Shopping List',
          line_items,
        };

        const endpoint = `${instacartBaseUrl}/idp/v1/products/products_link`;

        console.log(
          JSON.stringify({
            level: 'info',
            msg: 'Calling Instacart Connect API: products_link (direct items)',
            correlationId,
            endpoint,
            payload: connectPayload,
          }),
        );

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${instacartApiKey}`,
          },
          body: JSON.stringify(connectPayload),
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

        const link = responseData?.products_link_url || '';
        if (!link) {
          return json(
            {
              error: 'Connect API did not return shopping list URL',
              details: responseData,
            },
            500,
            correlationId,
          );
        }

        return json(
          {
            status: 'success',
            instacart_list_url: link,
            products_link_url: link,
            shopping_list_url: link,
          },
          200,
          correlationId,
        );
      }

      /**
       * get_nearby_retailers
       *
       * This still uses the Connect REST API directly since MCP only provides
       * recipe + shopping list tools.
       */
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
        error:
          error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      500,
      correlationId,
    );
  }
});

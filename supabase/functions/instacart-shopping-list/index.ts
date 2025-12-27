// supabase/functions/instacart-shopping-list/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

declare const Deno: any;

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const INSTACART_API_KEY = Deno.env.get('INSTACART_API_KEY');

const INSTACART_ENV = Deno.env.get('INSTACART_ENV') || 'development';
const INSTACART_MCP_URL =
  INSTACART_ENV === 'production'
    ? 'https://mcp.instacart.com/mcp'
    : 'https://mcp.dev.instacart.tools/mcp';

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

async function callInstacartMcpTool(
  correlationId: string,
  toolName: 'create-shopping-list' | 'create-recipe',
  args: Record<string, unknown>,
): Promise<{ payloadJson: any }> {
  if (!INSTACART_API_KEY) {
    throw new Error('Missing INSTACART_API_KEY');
  }

  const mcpPayload = {
    jsonrpc: '2.0',
    id: correlationId,
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: args,
    },
  };

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'Calling Instacart MCP tool',
      correlationId,
      environment: INSTACART_ENV,
      mcpUrl: INSTACART_MCP_URL,
      toolName,
      args: JSON.stringify(args, null, 2),
    }),
  );

  const res = await fetch(INSTACART_MCP_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INSTACART_API_KEY}`,
    },
    body: JSON.stringify(mcpPayload),
  });

  const text = await res.text();
  let data: any;
  
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'Instacart MCP raw response',
      correlationId,
      status: res.status,
      data: JSON.stringify(data),
    }),
  );

  if (!res.ok || data?.error) {
    throw new Error(
      `MCP error: ${JSON.stringify(data?.error ?? data)}`,
    );
  }

  const result = data?.result;

  if (result?.isError) {
    const errText =
      result?.content?.[0]?.text ??
      'Unknown MCP error (isError=true, no content text)';
    throw new Error(`MCP reported error: ${errText}`);
  }

  let payloadText = '';
  try {
    const first = result?.content?.[0];
    if (first?.type === 'text') payloadText = first.text;
    else if (typeof first?.text === 'string') payloadText = first.text;
  } catch {
    payloadText = '';
  }

  if (!payloadText) {
    throw new Error('MCP result did not include text content');
  }

  let payloadJson: any;
  try {
    const match = payloadText.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : payloadText;
    payloadJson = JSON.parse(jsonStr);
  } catch {
    // If not JSON, try to extract URL from plain text response
    const urlMatch = payloadText.match(/https?:\/\/[^\s\n]+/);
    if (urlMatch) {
      payloadJson = {
        url: urlMatch[0],
        products_link_url: urlMatch[0],
        shopping_list_url: urlMatch[0],
        raw: payloadText,
      };
    } else {
      payloadJson = { raw: payloadText };
    }
  }

  return { payloadJson };
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
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing INSTACART_API_KEY',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        },
      );
    }

    const body = (await req.json()) as {
      action?: string;
      items?: Array<{ name: string; quantity?: number; unit?: string; category?: string }>;
      title?: string;
      retailer_key?: string;
    };

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Processing shopping list request',
        correlationId,
        receivedBody: JSON.stringify(body),
        action: body.action,
        itemCount: body.items?.length || 0,
        hasRetailerKey: !!body.retailer_key,
        retailerKey: body.retailer_key || 'none',
      }),
    );

    if (!body.action) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing required field: action',
          received: body,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        },
      );
    }

    if (body.action !== 'create_shopping_list') {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: `Unknown action: ${body.action}`,
          expectedAction: 'create_shopping_list',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        },
      );
    }

    const items = body.items || [];
    
    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'No items provided',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        },
      );
    }

    const title = body.title || 'My Shopping List';

    // Validate and format line items
    const lineItems = items
      .map((it: any) => {
        const name = String(it?.name || '').trim();
        if (!name) return null;

        const item: any = { name };
        
        // Ensure quantity is a valid number
        if (it.quantity !== null && it.quantity !== undefined) {
          const qty = Number(it.quantity);
          if (!isNaN(qty) && qty > 0) {
            item.quantity = qty;
          }
        }
        
        // Add unit if provided
        if (it.unit && String(it.unit).trim()) {
          item.unit = String(it.unit).trim();
        }
        
        return item;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    if (lineItems.length === 0) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'No valid items after validation',
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        },
      );
    }

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Validated shopping list items',
        correlationId,
        lineItemCount: lineItems.length,
        sampleLineItem: lineItems[0],
      }),
    );

    // MCP expects camelCase field names
    const mcpArgs: any = {
      title,
      lineItems,
    };

    // NOTE: Instacart's create-shopping-list API does NOT support pre-selecting a retailer.
    // Retailer selection happens on the Instacart website after the user opens the cart link.
    // We still accept and log retailer_key for reference and future compatibility.
    if (body.retailer_key) {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'Retailer key received (NOT sent to MCP - not supported by Instacart API)',
          correlationId,
          retailerKey: body.retailer_key,
          note: 'User must select retailer manually on Instacart website',
        }),
      );
      // Not adding to mcpArgs as Instacart API doesn't support it
      // mcpArgs.retailerKey = body.retailer_key;
    } else {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'No retailer_key provided in request',
          correlationId,
        }),
      );
    }

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Final MCP arguments',
        correlationId,
        mcpArgs: JSON.stringify(mcpArgs, null, 2),
      }),
    );

    const { payloadJson } = await callInstacartMcpTool(
      correlationId,
      'create-shopping-list',
      mcpArgs,
    );

    let listUrl =
      payloadJson?.shopping_list_url ||
      payloadJson?.instacart_list_url ||
      payloadJson?.products_link_url ||
      payloadJson?.url ||
      '';

    if (!listUrl) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'MCP did not return shopping list URL',
          details: payloadJson,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        },
      );
    }

    // Transform dev URL to production URL for end users
    if (listUrl.includes('customers.dev.instacart.tools')) {
      listUrl = listUrl.replace(
        'customers.dev.instacart.tools',
        'www.instacart.com'
      );
    }

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Successfully created shopping list',
        correlationId,
        url: listUrl,
        mcpResponse: JSON.stringify(payloadJson),
      }),
    );

    return new Response(
      JSON.stringify({
        status: 'success',
        products_link_url: listUrl,
        shopping_list_url: listUrl,
        items: lineItems,
        retailer_key_sent: body.retailer_key || null,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      },
    );
  } catch (err: any) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'instacart-shopping-list error',
        error: err?.message ?? String(err),
        stack: err?.stack,
        correlationId,
      }),
    );

    return new Response(
      JSON.stringify({
        status: 'error',
        message: err?.message ?? 'Unexpected error in instacart-shopping-list',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      },
    );
  }
});
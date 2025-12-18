// supabase/functions/instacart-agent/index.ts
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

declare const Deno: any;

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const INSTACART_API_KEY = Deno.env.get('INSTACART_API_KEY');

// 🔹 Env switch: dev vs prod Connect API
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

function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

Deno.serve(async (req: Request) => {
  const correlationId = getCorrelationId(req);

  // CORS preflight
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
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Missing OPENAI_API_KEY' }),
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

    if (!INSTACART_API_KEY) {
      return new Response(
        JSON.stringify({ status: 'error', message: 'Missing INSTACART_API_KEY' }),
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
      shoppingSentence?: unknown;
      retailer_key?: string; // accepted but NOT sent to Connect API
      postal_code?: string;  // accepted but NOT sent to Connect API
    };

    const shoppingSentence = body?.shoppingSentence;
    const retailerKey =
      typeof body?.retailer_key === 'string' ? body.retailer_key : undefined;
    const postalCode =
      typeof body?.postal_code === 'string' ? body.postal_code : '33328';

    if (!shoppingSentence || typeof shoppingSentence !== 'string') {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'shoppingSentence must be a non-empty string',
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

    //
    // 1) Use OpenAI just to extract normalized items
    //
    const extractionRes = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        instructions:
          'You extract structured grocery items from user text. ' +
          'Return ONLY JSON, no prose. Format: ' +
          '{ "title": string, "items": [ { "name": string, "quantity": number | null, "unit": string | null } ] }. ' +
          'IMPORTANT: name must contain ONLY the product name (e.g., "milk", "chicken", "bread"). ' +
          'NEVER embed quantity or unit in the name. ' +
          'Put quantity in the "quantity" field and unit in the "unit" field separately. ' +
          'Use everyday grocery units like "loaf", "dozen", "gallon", "lb", "cup", "tsp", etc. ' +
          'If quantity or unit are not clear, use null.',
        input: shoppingSentence,
      }),
    });

    if (!extractionRes.ok) {
      const text = await extractionRes.text();
      return new Response(
        JSON.stringify({
          status: 'error',
          message: `Failed to parse shopping request: ${text}`,
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

    const extractionData: any = await extractionRes.json();

    let extractionText = '';
    try {
      const outputs = Array.isArray(extractionData.output)
        ? extractionData.output
        : [];
      const msg =
        outputs.find((o: any) => o.type === 'message') ?? outputs[0] ?? null;
      const content = Array.isArray(msg?.content)
        ? msg.content
        : msg?.content ?? [];
      const textItem =
        content.find(
          (c: any) => c?.type === 'output_text' || c?.type === 'text',
        ) ?? content[0];
      extractionText = textItem?.text ?? '';
    } catch {
      extractionText = '';
    }

    let parsed: {
      title?: string;
      items?: { name: string; quantity?: number | null; unit?: string | null }[];
    } = { title: undefined, items: [] };

    try {
      const jsonMatch = extractionText.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(extractionText);
    } catch {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Could not parse items from AI response',
          raw: extractionText,
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

    const title =
      parsed.title?.trim() || 'Shopping list from BusyMomsAssistantAI';
    const items = Array.isArray(parsed.items) ? parsed.items : [];

    if (!items.length) {
      return new Response(
        JSON.stringify({
          status: 'error',
          items: [],
          instacart_list_url: '',
          message: 'No items were detected in your request.',
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

    //
    // 2) Create shopping list page using Instacart Connect API
    //
    const line_items = items.map((it) => {
      const quantity =
        typeof it.quantity === 'number' && !Number.isNaN(it.quantity)
          ? it.quantity
          : undefined;

      const unit =
        typeof it.unit === 'string' && it.unit.trim().length > 0
          ? it.unit.trim()
          : undefined;

      const parts: string[] = [];
      if (quantity != null) parts.push(String(quantity));
      if (unit) parts.push(unit);
      parts.push(it.name);
      const display_text = parts.join(' ').trim();

      const li: any = { name: it.name, display_text };
      if (quantity != null) li.quantity = quantity;
      if (unit) li.unit = unit;
      return li;
    });

    const connectPayload: any = {
      title,
      link_type: 'shopping_list',
      line_items,
    };

    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'Creating Instacart products_link (Connect API)',
        correlationId,
        environment: INSTACART_ENV,
        baseUrl: INSTACART_BASE_URL,
        retailerKey,
        postalCode,
        connectPayload,
      }),
    );

    const instacartRes = await fetch(
      `${INSTACART_BASE_URL}/idp/v1/products/products_link`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${INSTACART_API_KEY}`,
        },
        body: JSON.stringify(connectPayload),
      },
    );

    const responseText = await instacartRes.text();
    const responseData = safeJsonParse(responseText);

    if (!instacartRes.ok) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Instacart Connect API error creating products link',
          http_status: instacartRes.status,
          details: responseData,
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

    const instacartUrl = (responseData as any)?.products_link_url || '';

    if (!instacartUrl) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Connect API did not return products_link_url',
          details: responseData,
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

    return new Response(
      JSON.stringify({
        status: 'success',
        items: line_items,
        instacart_list_url: instacartUrl,
        products_link_url: instacartUrl,
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
    return new Response(
      JSON.stringify({
        status: 'error',
        message: err?.message ?? 'Unexpected error in instacart-agent',
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

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

declare const Deno: any;

/**
 * ENV VARS REQUIRED
 *
 * OPENAI_API_KEY        - Project-level key for OpenAI
 * INSTACART_API_KEY     - Instacart Developer API key (used for MCP)
 * INSTACART_ENV         - 'development' or 'production' (optional, defaults 'development')
 *
 * MCP ENDPOINTS:
 *   dev:  https://mcp.dev.instacart.tools/mcp
 *   prod: https://mcp.instacart.com/mcp
 */

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

/** Ensure every request has a correlation ID for logs + debugging */
function getCorrelationId(req: Request) {
  return (
    req.headers.get('x-correlation-id') ||
    req.headers.get('X-Correlation-ID') ||
    crypto.randomUUID()
  );
}

/** Safe JSON parse – if parsing fails, return a wrapper object with raw text */
function safeJsonParse(text: string) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

/**
 * Helper: use OpenAI Chat Completions to turn natural language into JSON.
 *
 * Only used when `shoppingSentence` is provided and `items` are NOT provided.
 */
async function extractJsonWithOpenAI(
  correlationId: string,
  instructions: string,
  userText: string,
): Promise<any> {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'Calling OpenAI for extraction',
      correlationId,
      userText: userText.substring(0, 100),
    }),
  );

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      messages: [
        { role: 'system', content: instructions },
        { role: 'user', content: userText },
      ],
    }),
  });

  const responseText = await res.text();

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'OpenAI response',
      correlationId,
      status: res.status,
      responsePreview: responseText.substring(0, 200),
    }),
  );

  if (!res.ok) {
    throw new Error(`OpenAI extraction failed (${res.status}): ${responseText}`);
  }

  let data: any;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Failed to parse OpenAI response as JSON: ${responseText}`);
  }

  // Chat completion format: choices[0].message.content
  const text =
    data?.choices?.[0]?.message?.content &&
    typeof data.choices[0].message.content === 'string'
      ? data.choices[0].message.content
      : '';

  if (!text) {
    throw new Error('OpenAI extraction gave empty output');
  }

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'OpenAI extracted text',
      correlationId,
      extractedText: text.substring(0, 200),
    }),
  );

  try {
    const match = text.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : text;
    return JSON.parse(jsonStr);
  } catch (err) {
    throw new Error(`Could not parse JSON from OpenAI output: ${text}. Error: ${err}`);
  }
}

/**
 * Helper: call Instacart MCP `tools/call`
 *
 * - toolName: 'create-shopping-list' | 'create-recipe'
 * - args: arguments to pass to the tool
 * - returns: parsed JSON payload from result.content[0].text
 */
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
  const data = safeJsonParse(text);

  console.log(
    JSON.stringify({
      level: 'info',
      msg: 'Instacart MCP raw response',
      correlationId,
      status: res.status,
      data: JSON.stringify(data),
    }),
  );

  // HTTP or JSON-RPC error
  if (!res.ok || (data as any)?.error) {
    throw new Error(
      `MCP error: ${JSON.stringify((data as any)?.error ?? data)}`,
    );
  }

  const result = (data as any)?.result;

  // Instacart MCP error flag
  if (result?.isError) {
    const errText =
      result?.content?.[0]?.text ??
      'Unknown MCP error (isError=true, no content text)';
    throw new Error(`MCP reported error: ${errText}`);
  }

  // Expected: result.content[0].text is a JSON string
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
    if (!OPENAI_API_KEY || !INSTACART_API_KEY) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing OPENAI_API_KEY or INSTACART_API_KEY',
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
      shoppingSentence?: unknown;
      retailer_key?: string;
      postal_code?: string;
      tool?: 'create-shopping-list' | 'create-recipe';
      items?: Array<{ name: string; quantity?: number; unit?: string }>;
      title?: string;
    };

    const shoppingSentence = body?.shoppingSentence;
    const tool: 'create-shopping-list' | 'create-recipe' =
      body?.tool || 'create-shopping-list';

    // Allow direct items to bypass OpenAI
    const directItems = Array.isArray(body?.items) ? body.items : null;
    const directTitle = typeof body?.title === 'string' ? body.title : null;

    if (!shoppingSentence && !directItems) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Either shoppingSentence or items array is required',
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
        msg: 'Processing request',
        correlationId,
        tool,
        hasShoppingSentence: !!shoppingSentence,
        hasDirectItems: !!directItems,
        shoppingSentence: shoppingSentence ? String(shoppingSentence).substring(0, 100) : null,
      }),
    );

    // -------------------------------------------------------------------
    // 1) Get structured data - either from OpenAI or direct input
    // -------------------------------------------------------------------
    let parsed: any;

    if (directItems) {
      // Use direct items - bypass OpenAI
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'Using direct items (bypassing OpenAI)',
          correlationId,
          itemCount: directItems.length,
        }),
      );

      parsed = {
        title: directTitle || 'Shopping list from Sara',
        items: directItems,
      };
    } else if (shoppingSentence && typeof shoppingSentence === 'string') {
      // Use OpenAI extraction
      let extractionInstructions: string;

      if (tool === 'create-recipe') {
        extractionInstructions =
          'You extract recipe information from user text. ' +
          'Return ONLY JSON, no prose. Format exactly as: ' +
          '{ "title": string, "servings": number, "prep_time": string, "cook_time": string, ' +
          '"ingredients": [ { "name": string, "quantity": number | null, "unit": string | null } ], ' +
          '"instructions": [ string ] }. ' +
          'If something is not specified, make a reasonable default (e.g. 4 servings).';
      } else {
        extractionInstructions =
          'You extract structured grocery items from user text. ' +
          'Return ONLY JSON, no prose. Format exactly as: ' +
          '{ "title": string, "items": [ { "name": string, "quantity": number | null, "unit": string | null } ] }. ' +
          'name must contain ONLY the product name (e.g., "milk", "chicken", "bread"). ' +
          'NEVER embed quantity or unit in the name. ' +
          'If quantity or unit are not clear, use null.';
      }

      try {
        parsed = await extractJsonWithOpenAI(
          correlationId,
          extractionInstructions,
          shoppingSentence,
        );
      } catch (err: any) {
        // If OpenAI fails, return helpful error with suggestion
        return new Response(
          JSON.stringify({
            status: 'error',
            message: `OpenAI extraction failed: ${err.message}`,
            suggestion: 'To bypass OpenAI, send items array directly in the request body',
            example: {
              items: [
                { name: 'chicken', quantity: 1, unit: 'lb' },
                { name: 'figs', quantity: 6, unit: null },
              ],
              title: 'My Shopping List',
            },
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
    } else {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Either shoppingSentence or items array is required',
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
        msg: 'Successfully parsed extraction',
        correlationId,
        parsed: JSON.stringify(parsed),
      }),
    );

    // -------------------------------------------------------------------
    // 2) Call Instacart MCP tool
    // CRITICAL: Use camelCase for MCP (lineItems, prepTime, cookTime)
    // -------------------------------------------------------------------
    if (tool === 'create-recipe') {
      const title =
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title.trim()
          : 'Recipe from Sara';
      const servings =
        typeof parsed.servings === 'number' ? parsed.servings : 4;
      const ingredientsArr = Array.isArray(parsed.ingredients)
        ? parsed.ingredients
        : [];
      const instructions = Array.isArray(parsed.instructions)
        ? parsed.instructions
        : [];
      const prepTime =
        typeof parsed.prep_time === 'string' && parsed.prep_time.trim()
          ? parsed.prep_time
          : '15 minutes';
      const cookTime =
        typeof parsed.cook_time === 'string' && parsed.cook_time.trim()
          ? parsed.cook_time
          : '30 minutes';

      if (!ingredientsArr.length || !instructions.length) {
        return new Response(
          JSON.stringify({
            status: 'error',
            message: 'No ingredients or instructions detected in your request.',
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

      // Validate and format ingredients
      const lineItems = ingredientsArr
        .map((ing: any) => {
          const name = String(ing?.name || '').trim();
          if (!name) return null;

          const item: any = { name };
          
          if (ing.quantity !== null && ing.quantity !== undefined) {
            const qty = Number(ing.quantity);
            if (!isNaN(qty) && qty > 0) {
              item.quantity = qty;
            }
          }
          
          if (ing.unit && String(ing.unit).trim()) {
            item.unit = String(ing.unit).trim();
          }
          
          return item;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      if (lineItems.length === 0) {
        return new Response(
          JSON.stringify({
            status: 'error',
            message: 'No valid ingredients detected',
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
          msg: 'Validated recipe data',
          correlationId,
          lineItemCount: lineItems.length,
          sampleLineItem: lineItems[0],
        }),
      );

      // MCP expects camelCase field names
      const mcpArgs = {
        title,
        servings,
        prepTime,
        cookTime,
        lineItems,
        instructions,
      };

      const { payloadJson } = await callInstacartMcpTool(
        correlationId,
        'create-recipe',
        mcpArgs,
      );

      const recipeUrl =
        payloadJson?.recipe_url ||
        payloadJson?.url ||
        payloadJson?.instacart_url ||
        payloadJson?.products_link_url ||
        '';

      if (!recipeUrl) {
        return new Response(
          JSON.stringify({
            status: 'error',
            message: 'MCP did not return recipe URL',
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

      return new Response(
        JSON.stringify({
          status: 'success',
          recipe_url: recipeUrl,
          recipe: {
            title,
            servings,
            prep_time: prepTime,
            cook_time: cookTime,
            ingredients: lineItems,
            instructions,
          },
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
    } else {
      // create-shopping-list
      const title =
        typeof parsed.title === 'string' && parsed.title.trim()
          ? parsed.title.trim()
          : 'Shopping list from Sara';
      const itemsArr = Array.isArray(parsed.items) ? parsed.items : [];

      if (!itemsArr.length) {
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

      // Validate and format items
      const lineItems = itemsArr
        .map((it: any) => {
          const name = String(it?.name || '').trim();
          if (!name) return null;

          const item: any = { name };
          
          if (it.quantity !== null && it.quantity !== undefined) {
            const qty = Number(it.quantity);
            if (!isNaN(qty) && qty > 0) {
              item.quantity = qty;
            }
          }
          
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
            message: 'No valid items detected after validation',
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
      const mcpArgs = {
        title,
        lineItems,
      };

      const { payloadJson } = await callInstacartMcpTool(
        correlationId,
        'create-shopping-list',
        mcpArgs,
      );

      const listUrl =
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

      return new Response(
        JSON.stringify({
          status: 'success',
          items: lineItems,
          instacart_list_url: listUrl,
          shopping_list_url: listUrl,
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
  } catch (err: any) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'instacart-agent error',
        error: err?.message ?? String(err),
        stack: err?.stack,
        correlationId,
      }),
    );

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
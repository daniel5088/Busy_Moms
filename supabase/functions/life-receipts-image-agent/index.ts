// supabase/functions/life-receipts-image-agent/index.ts

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReceiptInfo {
  content: string;
  where?: string;
  who?: string;
  when?: string;
  obligation?: string;
}

interface ProcessImageRequest {
  action: 'process_image' | 'ping';
  image_data?: string;
  image_type?: string;
}

interface ProcessImageResponse {
  receipt: ReceiptInfo | null;
}

Deno.serve(async (req: Request) => {
  const incomingId = req.headers.get('x-correlation-id');
  const correlationId = incomingId ?? crypto.randomUUID();

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        ...corsHeaders,
        'x-correlation-id': correlationId,
      },
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'OPENAI_API_KEY missing',
          correlationId,
        })
      );
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const { action, image_data, image_type }: ProcessImageRequest = await req.json();

    if (action === 'ping') {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'life-receipts-image-agent ping',
          correlationId,
        })
      );
      return new Response(
        JSON.stringify({ ok: true, source: 'life-receipts-image-agent' }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'x-correlation-id': correlationId,
          },
        }
      );
    }

    if (action === 'process_image') {
      if (!image_data || !image_type) {
        return new Response(
          JSON.stringify({ error: 'image_data and image_type are required' }),
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

      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'Processing life receipt image',
          correlationId,
          imageType: image_type,
        })
      );

      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Analyze this image and extract information for a "Life Receipt" - a thought, task, or reminder someone wants to capture.

CRITICAL RULES:

1. WORD LIMITS (strictly enforce):
   - where, who, obligation: 1 word preferred, 2 max, 3 only in rare edge cases
   - If you can't determine, use "unknown" (single word)
   - Examples: "store" not "grocery store shopping", "mom" not "my mother", "buy" not "need to purchase"

2. WHEN FIELD (must be exactly one of these):
   - "now" - ONLY if explicitly urgent: "today", "right now", "ASAP", "urgent", "before [time today]"
   - "soon" - ONLY if explicitly near-future: "tomorrow", "this weekend", "by Friday", "this week"
   - "very_important" - ONLY if explicitly critical: "urgent", "important", "must", "deadline", "emergency", "critical"
   - "someday" - DEFAULT. Use this if NO explicit timeframe or urgency is indicated

   DO NOT guess urgency. If unclear, use "someday".

Extract:
- content: The main text/thought (required, can be longer)
- where: Location or context (1-3 words max)
- who: Person involved (1-3 words max)
- when: One of: "now", "soon", "very_important", or "someday" (default)
- obligation: Action needed (1-3 words max)

Return ONLY a JSON object:
{
  "receipt": {
    "content": "main text or thought from the image",
    "where": "location" or "unknown",
    "who": "person" or "unknown",
    "when": "someday",
    "obligation": "action" or "unknown"
  }
}

If no meaningful content is found, return {"receipt": null}

Examples:
- "buy sneakers for manuel" → where: "store", who: "manuel", when: "someday", obligation: "buy"
- "call mom TODAY" → where: "phone", who: "mom", when: "now", obligation: "call"
- "email report by Friday" → where: "work", who: "unknown", when: "soon", obligation: "email"
- "URGENT: fix server" → where: "work", who: "unknown", when: "very_important", obligation: "fix"`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${image_type};base64,${image_data}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 500,
        }),
      });

      const openaiData = await openaiResponse.json();

      if (!openaiResponse.ok) {
        console.error(
          JSON.stringify({
            level: 'error',
            msg: 'OpenAI API error',
            correlationId,
            status: openaiResponse.status,
            details: openaiData,
          })
        );
        return new Response(
          JSON.stringify({
            error: 'Failed to process image with AI',
            details: openaiData,
            status: openaiResponse.status,
          }),
          {
            status: openaiResponse.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'x-correlation-id': correlationId,
            },
          }
        );
      }

      const messageContent = openaiData.choices[0].message.content;
      const cleanText = messageContent.replace(/```json|```/g, '').trim();
      const parsedResult: ProcessImageResponse = JSON.parse(cleanText);

      // Validate and normalize the receipt data
      if (parsedResult.receipt) {
        const receipt = parsedResult.receipt;

        // Normalize where, who, obligation: trim, collapse whitespace, max 3 words
        const normalizeField = (field: string | undefined): string => {
          if (!field) return 'unknown';
          const trimmed = field.trim().replace(/\s+/g, ' ');
          const words = trimmed.split(' ');
          if (words.length > 3) {
            return words.slice(0, 3).join(' ');
          }
          return trimmed || 'unknown';
        };

        receipt.where = normalizeField(receipt.where);
        receipt.who = normalizeField(receipt.who);
        receipt.obligation = normalizeField(receipt.obligation);

        // Validate and normalize when: must be one of the 4 allowed values
        const validWhenValues = ['now', 'soon', 'someday', 'very_important'];
        const normalizedWhen = receipt.when?.toLowerCase().trim().replace(/\s+/g, '_');
        receipt.when = validWhenValues.includes(normalizedWhen || '') ? normalizedWhen : 'someday';
      }

      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'Image processed successfully',
          correlationId,
          receiptFound: parsedResult.receipt !== null,
        })
      );

      return new Response(JSON.stringify(parsedResult), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Supported actions: process_image, ping' }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      }
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'Edge function error',
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      })
    );

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
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

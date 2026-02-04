// supabase/functions/life-receipts-text-agent/index.ts

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

interface ProcessTextRequest {
  action: 'process_text' | 'ping';
  text?: string;
}

interface ProcessTextResponse {
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

    const { action, text }: ProcessTextRequest = await req.json();

    if (action === 'ping') {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'life-receipts-text-agent ping',
          correlationId,
        })
      );
      return new Response(
        JSON.stringify({ ok: true, source: 'life-receipts-text-agent' }),
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

    if (action === 'process_text') {
      if (!text || text.trim().length === 0) {
        return new Response(
          JSON.stringify({ error: 'text is required and cannot be empty' }),
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
          msg: 'Processing life receipt text',
          correlationId,
        })
      );

      // Extract structured fields from text
      const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
              content: `Analyze this text and extract information for a "Life Receipt" - a thought, task, or reminder someone wants to capture.

CRITICAL RULES:

1. WORD LIMITS (strictly enforce):
   - where, who, obligation: 1 word preferred, 2 max, 3 only in rare edge cases
   - If you can't determine, use "unknown" (single word)
   - Examples: "store" not "grocery store shopping", "mom" not "my mother", "buy" not "need to purchase"

2. WHO FIELD SPECIAL RULES:
   - If the task is for the USER themselves (e.g., "I need to call", "remind me to", "I should"), use "myself" (single word)
   - "myself" is the canonical value for user-assigned tasks
   - If another person is mentioned, use their name (short form, 1-2 words max)
   - If unclear, use "unknown"
   - Examples: "I need to call dentist" → who: "myself", "buy sneakers for manuel" → who: "manuel"

3. WHEN FIELD (must be exactly one of these):
   - "now" - ONLY if explicitly urgent: "today", "right now", "ASAP", "urgent", "before [time today]"
   - "soon" - ONLY if explicitly near-future: "tomorrow", "this weekend", "by Friday", "this week"
   - "very_important" - ONLY if explicitly critical: "urgent", "important", "must", "deadline", "emergency", "critical"
   - "someday" - DEFAULT. Use this if NO explicit timeframe or urgency is indicated

   DO NOT guess urgency. If unclear, use "someday".

Extract:
- content: The main text/thought (required, can be longer)
- where: Location or context (1-3 words max)
- who: Person involved - use "myself" for user tasks, name for others, or "unknown" (1-3 words max)
- when: One of: "now", "soon", "very_important", or "someday" (default)
- obligation: Action needed (1-3 words max)

Return ONLY a JSON object:
{
  "receipt": {
    "content": "main text or thought from the input",
    "where": "location" or "unknown",
    "who": "myself" or "person" or "unknown",
    "when": "someday",
    "obligation": "action" or "unknown"
  }
}

If no meaningful content is found, return {"receipt": null}

Examples:
- "I need to call the dentist tomorrow" → where: "phone", who: "myself", when: "soon", obligation: "call"
- "buy sneakers for manuel" → where: "store", who: "manuel", when: "someday", obligation: "buy"
- "remind me to email the report by Friday" → where: "work", who: "myself", when: "soon", obligation: "email"
- "URGENT: I must fix the server" → where: "work", who: "myself", when: "very_important", obligation: "fix"
- "pick up milk" → where: "store", who: "myself", when: "someday", obligation: "buy"

Input text: "${text}"`,
            },
          ],
          max_tokens: 500,
        }),
      });

      const extractionData = await extractionResponse.json();

      if (!extractionResponse.ok) {
        console.error(
          JSON.stringify({
            level: 'error',
            msg: 'OpenAI extraction error',
            correlationId,
            status: extractionResponse.status,
            details: extractionData,
          })
        );
        return new Response(
          JSON.stringify({
            error: 'Failed to extract receipt info from text',
            details: extractionData,
            status: extractionResponse.status,
          }),
          {
            status: extractionResponse.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'x-correlation-id': correlationId,
            },
          }
        );
      }

      const messageContent = extractionData.choices[0].message.content;
      const cleanText = messageContent.replace(/```json|```/g, '').trim();
      const parsedResult: ProcessTextResponse = JSON.parse(cleanText);

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
          msg: 'Text processed successfully',
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
      JSON.stringify({ error: 'Invalid action. Supported actions: process_text, ping' }),
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

// supabase/functions/life-receipts-image-agent/index.ts

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ReceiptInfo {
  content: string;
  what?: string;
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

Look for:
- Main content/text/thought (required)
- What: What task or item is this about?
- Who: Who is involved or mentioned?
- When: Time context (use "now", "soon", or "later")
- Obligation/Action: What action is needed?

Return ONLY a JSON object with this structure:
{
  "receipt": {
    "content": "main text or thought from the image",
    "what": "task or item description" or null,
    "who": "person involved" or null,
    "when": "now" or "soon" or "later" or null,
    "obligation": "action needed" or null
  }
}

If no meaningful content is found, return {"receipt": null}

Be generous in interpretation - any text, note, reminder, or thought in the image should be captured as content.`,
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

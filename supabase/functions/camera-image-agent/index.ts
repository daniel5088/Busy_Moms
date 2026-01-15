// supabase/functions/calendar-image-agent/index.ts

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CalendarEvent {
  title: string;
  date: string;
  time?: string | null;
  description?: string;
}

interface ProcessImageRequest {
  action: 'process_image' | 'ping';
  image_data?: string; // base64 encoded image
  image_type?: string; // e.g., 'image/jpeg', 'image/png'
}

interface ProcessImageResponse {
  events: CalendarEvent[];
}

Deno.serve(async (req: Request) => {
  // Get or generate correlation ID
  const incomingId = req.headers.get('x-correlation-id');
  const correlationId = incomingId ?? crypto.randomUUID();

  // Handle CORS preflight
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

    // Ping endpoint for health check
    if (action === 'ping') {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'calendar-image-agent ping',
          correlationId,
        })
      );
      return new Response(
        JSON.stringify({ ok: true, source: 'calendar-image-agent' }),
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

    // Process image action
    if (action === 'process_image') {
      // Validate required fields
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
          msg: 'Processing calendar image',
          correlationId,
          imageType: image_type,
        })
      );

      // Call OpenAI Vision API
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
                  text: `Analyze this image and extract any calendar event information. Look for dates, times, event names, locations, or any scheduling information.\n\nIMPORTANT DATE RULES:\n- If a date has NO YEAR specified, assume it's for the current year (2025)\n- If the date has already passed in the current year, assume it's for NEXT YEAR (2026)\n- For example, if today is December 25, 2025 and you see "December 20", that means December 20, 2026\n- If you see "January 15" in December 2025, that means January 15, 2026\n\nReturn ONLY a JSON object with this structure:\n{\n  "events": [\n    {\n      "title": "event name",\n      "date": "YYYY-MM-DD",\n      "time": "HH:MM" or null,\n      "description": "any additional details",\n      "location": "location if mentioned" or null\n    }\n  ]\n}\nIf no event information is found, return {"events": []}\n\nCurrent date for reference: ${new Date().toISOString().split('T')[0]}`,
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

      // Extract and parse the response
      const messageContent = openaiData.choices[0].message.content;
      const cleanText = messageContent.replace(/```json|```/g, '').trim();
      const parsedResult: ProcessImageResponse = JSON.parse(cleanText);

      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'Image processed successfully',
          correlationId,
          eventsFound: parsedResult.events.length,
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

    // Invalid action
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
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ContactData {
  name: string;
  jobTitle?: string;
  company?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  confidence: number;
}

interface ProcessImageRequest {
  action: 'process_image' | 'ping';
  image_data?: string;
  image_type?: string;
}

interface ProcessImageResponse {
  contact: ContactData | null;
  rawText?: string;
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
          msg: 'business-card-ocr ping',
          correlationId,
        })
      );
      return new Response(
        JSON.stringify({ ok: true, source: 'business-card-ocr' }),
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
          msg: 'Processing business card image',
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
                  text: `Analyze this business card image and extract contact information. Extract as much information as possible and be intelligent about parsing different formats and layouts.

EXTRACTION RULES:
- Extract full name (combine first and last name into one "name" field)
- Extract job title/position
- Extract company/organization name
- Extract phone number(s) - if multiple, prefer mobile/cell over office
- Extract email address(es) - if multiple, prefer primary/work email
- Extract physical address if present
- Extract website/URL if present
- Provide a confidence score (0-100) for the overall extraction quality

FORMATTING RULES:
- Clean up phone numbers (remove extra spaces, format consistently)
- Ensure email addresses are valid format
- Remove any extra whitespace or formatting characters
- If text is unclear, make your best guess but lower the confidence score

Return ONLY a JSON object with this exact structure:
{
  "contact": {
    "name": "Full Name" or null,
    "jobTitle": "Job Title" or null,
    "company": "Company Name" or null,
    "phone": "Phone Number" or null,
    "email": "email@domain.com" or null,
    "address": "Full Address" or null,
    "website": "https://website.com" or null,
    "confidence": 0-100
  },
  "rawText": "all visible text from the card for reference"
}

If no business card is detected or image is unclear, return:
{
  "contact": null,
  "rawText": "description of what you see"
}`,
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
          max_tokens: 800,
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
          msg: 'Business card processed successfully',
          correlationId,
          contactFound: !!parsedResult.contact,
          confidence: parsedResult.contact?.confidence || 0,
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

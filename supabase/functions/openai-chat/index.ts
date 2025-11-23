import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

declare const Deno: any;

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

function getCorrelationId(req: Request) {
  return req.headers.get('x-correlation-id') || req.headers.get('X-Correlation-ID') || crypto.randomUUID();
}

Deno.serve(async (req: Request) => {
  const correlationId = getCorrelationId(req);

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Missing OpenAI key' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
      });
    }

    const { messages } = await req.json();

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'x-correlation-id': correlationId,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const data = await openaiRes.json();

    return new Response(
      JSON.stringify({
        content: data.choices?.[0]?.message?.content ?? '',
      }),
      { headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'x-correlation-id': correlationId },
    });
  }
});

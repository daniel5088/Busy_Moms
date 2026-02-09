// supabase/functions/life-receipts-audio-agent/index.ts

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

interface ProcessAudioRequest {
  action: 'process_audio' | 'ping';
  audio_data?: string;
  audio_type?: string;
}

interface ProcessAudioResponse {
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

    const { action, audio_data, audio_type }: ProcessAudioRequest = await req.json();

    if (action === 'ping') {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'life-receipts-audio-agent ping',
          correlationId,
        })
      );
      return new Response(
        JSON.stringify({ ok: true, source: 'life-receipts-audio-agent' }),
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

    if (action === 'process_audio') {
      if (!audio_data || !audio_type) {
        return new Response(
          JSON.stringify({ error: 'audio_data and audio_type are required' }),
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
          msg: 'Processing life receipt audio',
          correlationId,
          audioType: audio_type,
        })
      );

      // Step 1: Transcribe audio using Whisper
      const audioBuffer = Uint8Array.from(atob(audio_data), c => c.charCodeAt(0));
      const audioBlob = new Blob([audioBuffer], { type: audio_type });

      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');

      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      if (!transcriptionResponse.ok) {
        const transcriptionError = await transcriptionResponse.json();
        console.error(
          JSON.stringify({
            level: 'error',
            msg: 'Whisper transcription error',
            correlationId,
            status: transcriptionResponse.status,
            details: transcriptionError,
          })
        );
        return new Response(
          JSON.stringify({
            error: 'Failed to transcribe audio',
            details: transcriptionError,
            status: transcriptionResponse.status,
          }),
          {
            status: transcriptionResponse.status,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
              'x-correlation-id': correlationId,
            },
          }
        );
      }

      const transcriptionData = await transcriptionResponse.json();
      const transcribedText = transcriptionData.text;

      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'Audio transcribed',
          correlationId,
          transcription: transcribedText,
        })
      );

      // Step 2: Extract structured fields from transcription
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
              content: `Analyze this transcribed voice note and extract information for a "Mental Note" - a thought, task, or reminder someone wants to capture.

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
    "content": "main text or thought from the transcription",
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
- "URGENT: fix server" → where: "work", who: "unknown", when: "very_important", obligation: "fix"

Transcribed text: "${transcribedText}"`,
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
            error: 'Failed to extract receipt info from transcription',
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
      const parsedResult: ProcessAudioResponse = JSON.parse(cleanText);

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
          msg: 'Audio processed successfully',
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
      JSON.stringify({ error: 'Invalid action. Supported actions: process_audio, ping' }),
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

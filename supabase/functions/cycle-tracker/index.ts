// supabase/functions/cycle-insights-agent/index.ts

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CycleData {
  currentPhase: 'period' | 'follicular' | 'ovulation' | 'luteal';
  cycleDay: number;
  cycleLength: number;
  periodLength: number;
  symptoms?: Array<{
    date: string;
    symptoms: string[];
  }>;
  cycleHistory?: Array<{
    date: string;
    cycleLength: number;
    periodLength: number;
  }>;
}

interface InsightsRequest {
  action: 'get_insights' | 'predict_period' | 'analyze_symptoms' | 'ping';
  cycle_data?: CycleData;
  user_id?: string;
}

interface InsightsResponse {
  currentPhaseInsight: string;
  energyLevel: 'high' | 'medium' | 'low';
  recommendations: string[];
  nutritionTips: string[];
  exerciseSuggestion: string;
  moodInsight: string;
  predictions: string;
  fertilityWindow?: {
    start: string;
    end: string;
    peak: string;
  };
}

interface PredictionResponse {
  nextPeriodDate: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  predictedSymptoms: string[];
  recommendations: string[];
}

interface SymptomAnalysis {
  patterns: Array<{
    symptom: string;
    frequency: string;
    phase: string;
  }>;
  insights: string[];
  recommendations: string[];
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

    const { action, cycle_data, user_id }: InsightsRequest = await req.json();

    // Ping endpoint for health check
    if (action === 'ping') {
      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'cycle-insights-agent ping',
          correlationId,
        })
      );
      return new Response(
        JSON.stringify({ ok: true, source: 'cycle-insights-agent' }),
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

    // Get AI-powered insights
    if (action === 'get_insights') {
      if (!cycle_data) {
        return new Response(
          JSON.stringify({ error: 'cycle_data is required for insights' }),
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
          msg: 'Generating cycle insights',
          correlationId,
          userId: user_id,
          phase: cycle_data.currentPhase,
        })
      );

      const symptomsList = cycle_data.symptoms
        ?.map(s => `${s.date}: ${s.symptoms.join(', ')}`)
        .join('\n') || 'No symptoms logged';

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
              role: 'system',
              content: `You are a women's health AI assistant specializing in menstrual cycle insights. Provide evidence-based, supportive, and personalized recommendations. Always maintain a caring, professional tone. Current date: ${new Date().toISOString().split('T')[0]}.`,
            },
            {
              role: 'user',
              content: `Analyze this menstrual cycle data and provide personalized insights:

Current Phase: ${cycle_data.currentPhase}
Cycle Day: ${cycle_data.cycleDay} of ${cycle_data.cycleLength}
Period Length: ${cycle_data.periodLength} days

Recent Symptoms:
${symptomsList}

Cycle History: ${cycle_data.cycleHistory?.length || 0} cycles tracked

Provide a JSON response with:
{
  "currentPhaseInsight": "2-3 sentence insight about the current phase and what's happening hormonally",
  "energyLevel": "high/medium/low based on phase and symptoms",
  "recommendations": ["3-4 actionable, specific recommendations"],
  "nutritionTips": ["2-3 specific foods or nutrients beneficial for this phase"],
  "exerciseSuggestion": "Specific exercise type and intensity for this phase",
  "moodInsight": "Expected mood patterns and coping strategies",
  "predictions": "What to expect in the next 3-5 days based on cycle phase",
  "fertilityWindow": {
    "start": "YYYY-MM-DD",
    "end": "YYYY-MM-DD", 
    "peak": "YYYY-MM-DD"
  }
}

Return ONLY valid JSON, no markdown formatting.`,
            },
          ],
          temperature: 0.7,
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
            error: 'Failed to generate insights',
            details: openaiData,
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
      const insights: InsightsResponse = JSON.parse(cleanText);

      console.log(
        JSON.stringify({
          level: 'info',
          msg: 'Insights generated successfully',
          correlationId,
          userId: user_id,
        })
      );

      return new Response(JSON.stringify(insights), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      });
    }

    // Predict next period
    if (action === 'predict_period') {
      if (!cycle_data) {
        return new Response(
          JSON.stringify({ error: 'cycle_data is required for predictions' }),
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
          msg: 'Predicting next period',
          correlationId,
          userId: user_id,
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
              role: 'system',
              content: 'You are a menstrual cycle prediction AI. Analyze cycle patterns to predict the next period with high accuracy.',
            },
            {
              role: 'user',
              content: `Based on this cycle history, predict the next period:

Current Cycle Day: ${cycle_data.cycleDay}
Average Cycle Length: ${cycle_data.cycleLength} days
Cycle History: ${JSON.stringify(cycle_data.cycleHistory || [])}

Today's date: ${new Date().toISOString().split('T')[0]}

Return ONLY a JSON object:
{
  "nextPeriodDate": "YYYY-MM-DD",
  "confidenceLevel": "high/medium/low based on consistency of cycle history",
  "predictedSymptoms": ["symptoms likely to occur based on past patterns"],
  "recommendations": ["2-3 preparation tips"]
}`,
            },
          ],
          temperature: 0.5,
          max_tokens: 400,
        }),
      });

      const openaiData = await openaiResponse.json();

      if (!openaiResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to generate prediction' }),
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
      const prediction: PredictionResponse = JSON.parse(cleanText);

      return new Response(JSON.stringify(prediction), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'x-correlation-id': correlationId,
        },
      });
    }

    // Analyze symptom patterns
    if (action === 'analyze_symptoms') {
      if (!cycle_data?.symptoms || cycle_data.symptoms.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Symptom data is required for analysis' }),
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
          msg: 'Analyzing symptom patterns',
          correlationId,
          userId: user_id,
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
              role: 'system',
              content: 'You are a symptom pattern analysis AI for menstrual health. Identify trends and provide actionable insights.',
            },
            {
              role: 'user',
              content: `Analyze these symptoms for patterns:

${JSON.stringify(cycle_data.symptoms, null, 2)}

Current Phase: ${cycle_data.currentPhase}
Cycle Length: ${cycle_data.cycleLength} days

Return ONLY a JSON object:
{
  "patterns": [
    {
      "symptom": "symptom name",
      "frequency": "how often it occurs",
      "phase": "which phase it's most common in"
    }
  ],
  "insights": ["2-3 insights about symptom patterns"],
  "recommendations": ["2-3 recommendations to manage symptoms"]
}`,
            },
          ],
          temperature: 0.6,
          max_tokens: 500,
        }),
      });

      const openaiData = await openaiResponse.json();

      if (!openaiResponse.ok) {
        return new Response(
          JSON.stringify({ error: 'Failed to analyze symptoms' }),
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
      const analysis: SymptomAnalysis = JSON.parse(cleanText);

      return new Response(JSON.stringify(analysis), {
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
      JSON.stringify({
        error: 'Invalid action. Supported: get_insights, predict_period, analyze_symptoms, ping',
      }),
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
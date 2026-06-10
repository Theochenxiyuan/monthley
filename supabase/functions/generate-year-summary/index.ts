const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YearSummaryRequest {
  year?: number;
  locale?: 'zh-CN' | 'en-US';
  stats?: unknown;
  months?: unknown[];
}

interface AiYearSummary {
  title: string;
  overview: string;
  highlights: string[];
  patterns: string[];
  suggestions: string[];
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidSummary(value: unknown): value is AiYearSummary {
  if (!value || typeof value !== 'object') return false;
  const summary = value as Record<string, unknown>;
  return (
    typeof summary.title === 'string' &&
    typeof summary.overview === 'string' &&
    Array.isArray(summary.highlights) &&
    Array.isArray(summary.patterns) &&
    Array.isArray(summary.suggestions) &&
    summary.highlights.every((item) => typeof item === 'string') &&
    summary.patterns.every((item) => typeof item === 'string') &&
    summary.suggestions.every((item) => typeof item === 'string')
  );
}

function buildPrompt(body: YearSummaryRequest) {
  const language = body.locale === 'en-US' ? 'English' : '简体中文';
  return `You are writing a personal annual review for Monthley, a private timeline app.\n\nLanguage: ${language}\nTone: warm, specific, reflective, concise. Avoid exaggeration and do not invent facts.\n\nReturn only valid JSON with this exact shape:\n{\n  "title": "string",\n  "overview": "string",\n  "highlights": ["string", "string", "string"],\n  "patterns": ["string", "string", "string"],\n  "suggestions": ["string", "string", "string"]\n}\n\nUse the user's yearly data below. Entry types: learn=learning, play=leisure/games, watch=watching, read=reading. Statuses: not_started, in_progress, completed.\n\nData:\n${JSON.stringify(body)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) {
    return jsonResponse({ error: 'DeepSeek API key is not configured' }, 500);
  }

  let body: YearSummaryRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.year || typeof body.year !== 'number' || !Array.isArray(body.months)) {
    return jsonResponse({ error: 'Invalid annual summary payload' }, 400);
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a careful annual review writer. Output only valid JSON.',
        },
        {
          role: 'user',
          content: buildPrompt(body),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return jsonResponse({ error: `DeepSeek request failed: ${errorText}` }, response.status);
  }

  const result = await response.json();
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    return jsonResponse({ error: 'DeepSeek returned an empty response' }, 502);
  }

  try {
    const summary = JSON.parse(content);
    if (!isValidSummary(summary)) {
      return jsonResponse({ error: 'DeepSeek returned an invalid summary shape' }, 502);
    }
    return jsonResponse({ data: summary });
  } catch {
    return jsonResponse({ error: 'DeepSeek returned invalid JSON' }, 502);
  }
});

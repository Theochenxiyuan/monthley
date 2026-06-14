const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TimelineEntry {
  id: string;
  name: string;
  type: 'learn' | 'play' | 'watch' | 'read';
  status: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
}

interface MonthData {
  year: number;
  month: number;
  entries: TimelineEntry[];
}

interface AutoScheduleRequest {
  unscheduled: TimelineEntry[];
  months: MonthData[];
  currentDate: string;
  locale?: 'zh-CN' | 'en-US';
  userInstruction?: string;
}

interface SchedulePlan {
  entryId: string;
  targetYear: number;
  targetMonth: number;
  reason: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isValidPlan(value: unknown): value is SchedulePlan[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      typeof item.entryId === 'string' &&
      typeof item.targetYear === 'number' &&
      typeof item.targetMonth === 'number' &&
      typeof item.reason === 'string' &&
      item.targetMonth >= 1 &&
      item.targetMonth <= 12 &&
      item.targetYear >= 2020 &&
      item.targetYear <= 2100,
  );
}

function buildPrompt(body: AutoScheduleRequest) {
  const language = body.locale === 'en-US' ? 'English' : '简体中文';
  const dateStr = body.currentDate;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const currentYear = parseInt(yearStr, 10);
  const currentMonth = parseInt(monthStr, 10);
  const currentDay = parseInt(dayStr, 10);
  const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
  const remainingDays = daysInCurrentMonth - currentDay + 1;

  const monthSummary = body.months
    .map((m) => {
      const entryList = m.entries
        .map((e) => `  - [${e.type}/${e.status}] ${e.name}${e.notes ? ` (${e.notes})` : ''}`)
        .join('\n');
      return `${m.year}-${String(m.month).padStart(2, '0')} (${m.entries.length} entries):\n${entryList || '  (empty)'}`;
    })
    .join('\n\n');

  const unscheduledList = body.unscheduled
    .map((e) => `- [${e.id}] [${e.type}/${e.status}] ${e.name}${e.notes ? ` (${e.notes})` : ''}`)
    .join('\n');
  const userInstruction = typeof body.userInstruction === 'string' && body.userInstruction.trim()
    ? body.userInstruction.trim()
    : '(none)';

  return `You are a scheduling assistant for Monthley, a private timeline app. Your task is to assign each unscheduled plan to the most appropriate future month.

Language: ${language}
Today's date: ${dateStr} (day ${currentDay} of ${currentMonth}, ${remainingDays} days remaining in current month)

Rules:
1. Each plan's assigned month represents the month when the plan is EXPECTED TO BE COMPLETED.
2. Only assign to the current month or future months.
3. For the current month: consider how many days remain (${remainingDays} days left). Only assign to current month if there is reasonable time to complete it.
4. Balance workload: prefer months with fewer entries.
5. Use semantic clues from the plan's name and notes (e.g., "summer vacation" → July/August, "year-end review" → December).
6. Entry types: learn=learning, play=leisure/games, watch=watching, read=reading. Statuses: not_started, in_progress, completed.
7. A completed entry in a month still counts as workload for that month.
8. Treat the user's scheduling preference as a soft constraint: follow it when possible, but never violate the hard constraints above.
9. The "reason" field must be written in ${language}.

User scheduling preference:
${userInstruction}

Current timeline (current month and future):
${monthSummary}

Unscheduled plans to assign:
${unscheduledList}

Return ONLY valid JSON with this exact shape:
{
  "plan": [
    { "entryId": "string", "targetYear": number, "targetMonth": number, "reason": "string" }
  ]
}

The reason should be brief (one short sentence). Every unscheduled entry must appear exactly once in the plan.`;
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

  let body: AutoScheduleRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!Array.isArray(body.unscheduled) || !Array.isArray(body.months) || typeof body.currentDate !== 'string') {
    return jsonResponse({ error: 'Invalid auto-schedule payload' }, 400);
  }

  if (body.unscheduled.length === 0) {
    return jsonResponse({ data: { plan: [] } });
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      temperature: 0.6,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are a careful scheduling assistant. Output only valid JSON.',
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
    const parsed = JSON.parse(content);
    const plan = parsed.plan;
    if (!isValidPlan(plan)) {
      return jsonResponse({ error: 'DeepSeek returned an invalid plan shape' }, 502);
    }
    return jsonResponse({ data: { plan } });
  } catch {
    return jsonResponse({ error: 'DeepSeek returned invalid JSON' }, 502);
  }
});

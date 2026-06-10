import { createClient } from 'jsr:@supabase/supabase-js@2';

const BUCKET = 'monthley-sync';
const SYNC_KEY_PATTERN = /^[a-zA-Z0-9]{8,32}$/;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EncryptedPayload {
  salt: string;
  iv: string;
  ciphertext: string;
}

interface SyncRequest {
  action?: 'upload' | 'download';
  syncKey?: string;
  payload?: unknown;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSecretKey(): string | null {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, unknown>;
      if (typeof parsed.default === 'string' && parsed.default) return parsed.default;
    } catch {
      // Fall back to legacy service-role env vars below.
    }
  }

  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY');
}

function isEncryptedPayload(value: unknown): value is EncryptedPayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return (
    typeof payload.salt === 'string' &&
    typeof payload.iv === 'string' &&
    typeof payload.ciphertext === 'string'
  );
}

function getErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const value = 'status' in error ? error.status : 'statusCode' in error ? error.statusCode : null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const secretKey = getSecretKey();
  if (!supabaseUrl || !secretKey) {
    return jsonResponse({ error: 'Supabase storage is not configured' }, 500);
  }

  let body: SyncRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.syncKey || !SYNC_KEY_PATTERN.test(body.syncKey)) {
    return jsonResponse({ error: 'Invalid sync key' }, 400);
  }

  const filename = `${body.syncKey}.json`;
  const supabase = createClient(supabaseUrl, secretKey);

  if (body.action === 'upload') {
    if (!isEncryptedPayload(body.payload)) {
      return jsonResponse({ error: 'Invalid encrypted payload' }, 400);
    }

    const { error } = await supabase.storage.from(BUCKET).upload(
      filename,
      JSON.stringify(body.payload),
      { upsert: true, contentType: 'application/json' },
    );

    if (error) {
      return jsonResponse({ error: error.message }, getErrorStatus(error) ?? 500);
    }

    return jsonResponse({ data: true });
  }

  if (body.action === 'download') {
    const { data, error } = await supabase.storage.from(BUCKET).download(filename);

    if (error) {
      const status = getErrorStatus(error);
      if (status === 404 || error.message?.includes('Object not found')) {
        return jsonResponse({ data: null });
      }
      return jsonResponse({ error: error.message }, status ?? 500);
    }

    if (!data) return jsonResponse({ data: null });

    try {
      const payload = JSON.parse(await data.text());
      if (!isEncryptedPayload(payload)) {
        return jsonResponse({ error: 'Invalid stored payload' }, 500);
      }
      return jsonResponse({ data: payload });
    } catch {
      return jsonResponse({ error: 'Invalid stored payload' }, 500);
    }
  }

  return jsonResponse({ error: 'Invalid action' }, 400);
});

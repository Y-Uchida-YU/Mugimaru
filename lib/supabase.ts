const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

function requireSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
}

async function supabaseRequest<T>(path: string, method: HttpMethod, body?: unknown): Promise<T> {
  requireSupabaseEnv();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
      'Content-Type': 'application/json',
      Prefer: method === 'GET' ? 'return=minimal' : 'return=representation',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) {
    return [] as T;
  }

  return (await response.json()) as T;
}

export const hasSupabaseEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export async function supabaseSelect<T>(pathAndQuery: string) {
  return supabaseRequest<T>(pathAndQuery, 'GET');
}

export async function supabaseInsert<T>(table: string, payload: unknown) {
  return supabaseRequest<T>(table, 'POST', payload);
}

export async function supabasePatch<T>(pathAndQuery: string, payload: unknown) {
  return supabaseRequest<T>(pathAndQuery, 'PATCH', payload);
}

export async function supabaseDelete<T>(pathAndQuery: string) {
  return supabaseRequest<T>(pathAndQuery, 'DELETE');
}

export async function supabaseUpsert<T>(table: string, payload: unknown, onConflict: string) {
  requireSupabaseEnv();
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase upsert failed (${response.status}): ${text}`);
  }

  return (await response.json()) as T;
}

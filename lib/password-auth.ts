const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type SupabasePasswordLoginResponse = {
  user?: {
    id?: string;
    email?: string;
    user_metadata?: {
      name?: string;
      full_name?: string;
      user_name?: string;
      avatar_url?: string;
      picture?: string;
    };
  };
};

export type PasswordLoginProfile = {
  externalId: string;
  email: string;
  name: string;
  avatarUrl: string;
};

function requireAuthEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase auth env is missing.');
  }
}

function buildHeaders() {
  requireAuthEnv();
  return {
    apikey: SUPABASE_ANON_KEY!,
    Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
    'Content-Type': 'application/json',
  };
}

export async function loginWithEmailAndPassword(
  email: string,
  password: string
): Promise<PasswordLoginProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedPassword = password.trim();

  if (!normalizedEmail) {
    throw new Error('Email is required.');
  }
  if (!normalizedPassword) {
    throw new Error('Password is required.');
  }

  requireAuthEnv();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      email: normalizedEmail,
      password: normalizedPassword,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ID or password login failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as SupabasePasswordLoginResponse;
  const user = data.user;
  const externalId = user?.id?.trim();
  if (!externalId) {
    throw new Error('Login succeeded but user id was missing.');
  }

  const verifiedEmail = user?.email?.trim().toLowerCase() || normalizedEmail;
  const fallbackName = verifiedEmail.split('@')[0] || 'User';
  const name =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.user_metadata?.user_name ||
    fallbackName;
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || '';

  return {
    externalId,
    email: verifiedEmail,
    name,
    avatarUrl,
  };
}

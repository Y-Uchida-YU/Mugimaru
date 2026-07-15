const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

type SupabaseVerifyResponse = {
  user?: {
    id?: string;
    email?: string;
    user_metadata?: {
      name?: string;
      full_name?: string;
    };
  };
};

export type VerifiedEmailProfile = {
  externalId: string;
  email: string;
  name: string;
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

export async function sendEmailVerificationCode(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  requireAuthEnv();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      email: normalizedEmail,
      create_user: true,
    }),
  });

  if (!response.ok) {
    throw new Error('認証コードを送信できませんでした。しばらくしてから再度お試しください。');
  }
}

export async function verifyEmailCode(email: string, code: string): Promise<VerifiedEmailProfile> {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedCode = code.trim();
  requireAuthEnv();

  const response = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      type: 'email',
      email: normalizedEmail,
      token: normalizedCode,
    }),
  });

  if (!response.ok) {
    throw new Error('認証コードが正しくないか、有効期限が切れています。');
  }

  const data = (await response.json()) as SupabaseVerifyResponse;
  const user = data.user;
  const externalId = user?.id?.trim();
  if (!externalId) {
    throw new Error('Email verification succeeded but user id was missing.');
  }

  const verifiedEmail = user?.email?.trim().toLowerCase() || normalizedEmail;
  const fallbackName = verifiedEmail.split('@')[0] || 'User';
  const name = user?.user_metadata?.full_name || user?.user_metadata?.name || fallbackName;

  return {
    externalId,
    email: verifiedEmail,
    name,
  };
}

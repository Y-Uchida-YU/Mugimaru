import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

export type SocialProvider = 'line' | 'x';

export type SocialAuthProfile = {
  externalId: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

type OAuthSessionResult = {
  code: string;
};

type LineTokenResponse = {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
};

type LineProfileResponse = {
  userId?: string;
  displayName?: string;
  pictureUrl?: string;
};

type XTokenResponse = {
  token_type: string;
  expires_in?: number;
  access_token: string;
  refresh_token?: string;
  scope?: string;
};

type XMeResponse = {
  data?: {
    id: string;
    name?: string;
    username?: string;
    profile_image_url?: string;
  };
};

type JwtPayload = {
  sub?: string;
  name?: string;
  email?: string;
};

const LINE_AUTHORIZE_URL = 'https://access.line.me/oauth2/v2.1/authorize';
const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

const X_AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize';
const X_TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const X_ME_URL = 'https://api.twitter.com/2/users/me?user.fields=name,username,profile_image_url';

const REDIRECT_PATH = 'auth/callback';
const PKCE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const OAUTH_REDIRECT_URI = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI;

WebBrowser.maybeCompleteAuthSession();

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getRedirectUri() {
  const configured = OAUTH_REDIRECT_URI?.trim();
  if (configured) {
    if (!/^https:\/\/[^/\s?#]+(?:[^\s]*)?$/.test(configured)) {
      throw new Error(
        'EXPO_PUBLIC_OAUTH_REDIRECT_URI must be a valid https URL. Example: https://your-app.vercel.app/auth/callback'
      );
    }
    return configured;
  }
  return Linking.createURL(REDIRECT_PATH, { scheme: 'mugimaru' });
}

function normalizeString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function toQueryString(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

function randomString(length: number) {
  const array = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < length; i += 1) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }

  let output = '';
  for (let i = 0; i < array.length; i += 1) {
    output += PKCE_CHARSET[array[i] % PKCE_CHARSET.length];
  }
  return output;
}

function bytesToBase64(bytes: Uint8Array) {
  let result = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const triple = (a << 16) | (b << 8) | c;

    result += BASE64_CHARS[(triple >> 18) & 63];
    result += BASE64_CHARS[(triple >> 12) & 63];
    result += i + 1 < bytes.length ? BASE64_CHARS[(triple >> 6) & 63] : '=';
    result += i + 2 < bytes.length ? BASE64_CHARS[triple & 63] : '=';
  }
  return result;
}

function toBase64Url(base64: string) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToString(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const bytes: number[] = [];

  for (let i = 0; i < padded.length; i += 4) {
    const c1 = BASE64_CHARS.indexOf(padded[i]);
    const c2 = BASE64_CHARS.indexOf(padded[i + 1]);
    const c3 = padded[i + 2] === '=' ? -1 : BASE64_CHARS.indexOf(padded[i + 2]);
    const c4 = padded[i + 3] === '=' ? -1 : BASE64_CHARS.indexOf(padded[i + 3]);

    const chunk = (c1 << 18) | (c2 << 12) | ((c3 < 0 ? 0 : c3) << 6) | (c4 < 0 ? 0 : c4);
    bytes.push((chunk >> 16) & 0xff);
    if (c3 >= 0) bytes.push((chunk >> 8) & 0xff);
    if (c4 >= 0) bytes.push(chunk & 0xff);
  }

  let output = '';
  for (let i = 0; i < bytes.length; i += 1) {
    output += String.fromCharCode(bytes[i]);
  }
  try {
    return new TextDecoder().decode(Uint8Array.from(bytes));
  } catch {
    return output;
  }
}

async function createCodeChallenge(codeVerifier: string) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto API is unavailable on this device.');
  }

  const data = new TextEncoder().encode(codeVerifier);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', data);
  return toBase64Url(bytesToBase64(new Uint8Array(digest)));
}

function parseOAuthUrl(url: string, expectedState: string): OAuthSessionResult {
  const parsed = Linking.parse(url);
  const queryParams = (parsed.queryParams ?? {}) as Record<string, unknown>;

  const error = normalizeString(queryParams.error);
  const errorDescription = normalizeString(queryParams.error_description);
  if (error) {
    throw new Error(errorDescription ? `${error}: ${errorDescription}` : error);
  }

  const state = normalizeString(queryParams.state);
  if (!state || state !== expectedState) {
    throw new Error('Invalid OAuth state.');
  }

  const code = normalizeString(queryParams.code);
  if (!code) {
    throw new Error('Authorization code was not returned by provider.');
  }

  return { code };
}

async function runOAuthCodeFlow(input: {
  authorizeUrl: string;
  authorizeParams: Record<string, string>;
  expectedState: string;
}) {
  const redirectUri = getRedirectUri();
  const query = toQueryString(input.authorizeParams);
  const authUrl = `${input.authorizeUrl}?${query}`;

  const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
  if (result.type !== 'success') {
    throw new Error('Authentication was cancelled.');
  }

  const returnUrl = normalizeString(result.url);
  if (!returnUrl) {
    throw new Error('Provider did not return a callback URL.');
  }

  return parseOAuthUrl(returnUrl, input.expectedState);
}

function parseJwtPayload(token?: string): JwtPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = base64UrlToString(parts[1]);
    return JSON.parse(payload) as JwtPayload;
  } catch {
    return null;
  }
}

export async function authenticateWithLine(): Promise<SocialAuthProfile> {
  const clientId = getRequiredEnv('EXPO_PUBLIC_LINE_CHANNEL_ID');
  const channelSecret = process.env.EXPO_PUBLIC_LINE_CHANNEL_SECRET;
  const redirectUri = getRedirectUri();
  const state = randomString(32);
  const codeVerifier = randomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  const { code } = await runOAuthCodeFlow({
    authorizeUrl: LINE_AUTHORIZE_URL,
    authorizeParams: {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    },
    expectedState: state,
  });

  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });
  if (channelSecret) {
    tokenParams.append('client_secret', channelSecret);
  }

  const tokenResponse = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`LINE token exchange failed (${tokenResponse.status}): ${text}`);
  }

  const token = (await tokenResponse.json()) as LineTokenResponse;
  const profileResponse = await fetch(LINE_PROFILE_URL, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    const text = await profileResponse.text();
    throw new Error(`LINE profile fetch failed (${profileResponse.status}): ${text}`);
  }

  const profile = (await profileResponse.json()) as LineProfileResponse;
  const idPayload = parseJwtPayload(token.id_token);
  const externalId = profile.userId ?? idPayload?.sub;
  if (!externalId) {
    throw new Error('LINE profile did not include user id.');
  }

  return {
    externalId,
    name: profile.displayName ?? idPayload?.name ?? 'LINE User',
    email: idPayload?.email ?? null,
    avatarUrl: profile.pictureUrl ?? null,
  };
}

export async function authenticateWithX(): Promise<SocialAuthProfile> {
  const clientId = getRequiredEnv('EXPO_PUBLIC_X_CLIENT_ID');
  const clientSecret = process.env.EXPO_PUBLIC_X_CLIENT_SECRET;
  const redirectUri = getRedirectUri();
  const state = randomString(32);
  const codeVerifier = randomString(64);
  const codeChallenge = await createCodeChallenge(codeVerifier);

  const { code } = await runOAuthCodeFlow({
    authorizeUrl: X_AUTHORIZE_URL,
    authorizeParams: {
      response_type: 'code',
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'tweet.read users.read offline.access',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    },
    expectedState: state,
  });

  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
  });
  if (clientSecret) {
    tokenParams.append('client_secret', clientSecret);
  }

  const tokenResponse = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: tokenParams.toString(),
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`X token exchange failed (${tokenResponse.status}): ${text}`);
  }

  const token = (await tokenResponse.json()) as XTokenResponse;
  const meResponse = await fetch(X_ME_URL, {
    headers: {
      Authorization: `Bearer ${token.access_token}`,
    },
  });

  if (!meResponse.ok) {
    const text = await meResponse.text();
    throw new Error(`X profile fetch failed (${meResponse.status}): ${text}`);
  }

  const me = (await meResponse.json()) as XMeResponse;
  const user = me.data;
  if (!user?.id) {
    throw new Error('X profile did not include user id.');
  }

  return {
    externalId: user.id,
    name: user.name ?? user.username ?? 'X User',
    email: null,
    avatarUrl: user.profile_image_url ?? null,
  };
}

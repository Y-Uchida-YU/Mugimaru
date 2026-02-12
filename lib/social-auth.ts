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
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

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

function rightRotate(value: number, amount: number) {
  return (value >>> amount) | (value << (32 - amount));
}

function sha256(message: Uint8Array) {
  const length = message.length;
  const bitLength = length * 8;
  const withOneByte = length + 1;
  const paddedLength = Math.ceil((withOneByte + 8) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[length] = 0x80;

  const view = new DataView(padded.buffer);
  const high = Math.floor(bitLength / 2 ** 32);
  const low = bitLength >>> 0;
  view.setUint32(paddedLength - 8, high);
  view.setUint32(paddedLength - 4, low);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (((w[i - 16] + s0) | 0) + ((w[i - 7] + s1) | 0)) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (((((h + S1) | 0) + ((ch + SHA256_K[i]) | 0)) | 0) + w[i]) >>> 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const result = new Uint8Array(32);
  const outputView = new DataView(result.buffer);
  outputView.setUint32(0, h0);
  outputView.setUint32(4, h1);
  outputView.setUint32(8, h2);
  outputView.setUint32(12, h3);
  outputView.setUint32(16, h4);
  outputView.setUint32(20, h5);
  outputView.setUint32(24, h6);
  outputView.setUint32(28, h7);
  return result;
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
  const data = new TextEncoder().encode(codeVerifier);
  const digest = sha256(data);
  return toBase64Url(bytesToBase64(digest));
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

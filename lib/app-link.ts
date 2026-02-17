const DEFAULT_APP_SCHEME = 'mugimaru';

export const APP_SCHEME = (process.env.EXPO_PUBLIC_APP_SCHEME || DEFAULT_APP_SCHEME).trim();

export function buildAuthCallbackDeepLink(query?: URLSearchParams) {
  const qs = query?.toString() ?? '';
  return `${APP_SCHEME}://auth/callback${qs ? `?${qs}` : ''}`;
}

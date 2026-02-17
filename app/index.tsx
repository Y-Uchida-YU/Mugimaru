import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { buildAuthCallbackDeepLink } from '@/lib/app-link';

export default function IndexRoute() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const { isHydrated, isAuthenticated } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const code = typeof params.code === 'string' ? params.code : '';
    const state = typeof params.state === 'string' ? params.state : '';
    const error = typeof params.error === 'string' ? params.error : '';
    const errorDescription =
      typeof params.error_description === 'string' ? params.error_description : '';

    if (!code && !error) return;

    const query = new URLSearchParams();
    if (code) query.set('code', code);
    if (state) query.set('state', state);
    if (error) query.set('error', error);
    if (errorDescription) query.set('error_description', errorDescription);

    const fallbackDeepLink = buildAuthCallbackDeepLink(query);
    window.location.replace(fallbackDeepLink);
  }, [params.code, params.error, params.error_description, params.state]);

  if (!isHydrated) {
    return null;
  }
  return <Redirect href={isAuthenticated ? '/(tabs)' : '/signup'} />;
}

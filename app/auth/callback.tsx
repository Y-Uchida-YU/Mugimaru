import { useEffect, useMemo } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { buildAuthCallbackDeepLink } from '@/lib/app-link';

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const nextUrl = useMemo(() => {
    const query = new URLSearchParams();
    if (typeof params.code === 'string') query.set('code', params.code);
    if (typeof params.state === 'string') query.set('state', params.state);
    if (typeof params.error === 'string') query.set('error', params.error);
    if (typeof params.error_description === 'string') {
      query.set('error_description', params.error_description);
    }
    return buildAuthCallbackDeepLink(query);
  }, [params.code, params.error, params.error_description, params.state]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const timer = window.setTimeout(() => {
      // Auto jump first; if blocked by browser, user can press the button below.
      window.location.replace(nextUrl);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [nextUrl]);

  const hasCode = typeof params.code === 'string' && params.code.length > 0;
  const hasError = typeof params.error === 'string' && params.error.length > 0;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#9b7a50" />
      <Text style={styles.title}>Redirecting to Mugimaru...</Text>
      <Text style={styles.caption}>
        {hasCode ? 'LINE authorization received.' : hasError ? 'Authorization error received.' : 'Waiting callback...'}
      </Text>
      <Pressable style={styles.button} onPress={() => window.location.assign(nextUrl)}>
        <Text style={styles.buttonText}>Open Mugimaru App</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#f8f2e8',
    gap: 10,
  },
  title: {
    color: '#4a3828',
    fontSize: 18,
    fontWeight: '700',
  },
  caption: {
    color: '#7f694f',
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#9b7a50',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});

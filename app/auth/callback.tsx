import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function OAuthCallbackScreen() {
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const query = new URLSearchParams();
    if (typeof params.code === 'string') query.set('code', params.code);
    if (typeof params.state === 'string') query.set('state', params.state);
    if (typeof params.error === 'string') query.set('error', params.error);
    if (typeof params.error_description === 'string') {
      query.set('error_description', params.error_description);
    }

    // Fallback deep-link redirect for providers that return via https page.
    const nextUrl = `mugimaru://auth/callback${query.toString() ? `?${query.toString()}` : ''}`;
    window.location.replace(nextUrl);
  }, [params.code, params.error, params.error_description, params.state]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="small" color="#9b7a50" />
      <Text style={styles.title}>Redirecting to Mugimaru...</Text>
      <Text style={styles.caption}>If nothing happens, return to the app manually.</Text>
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
});

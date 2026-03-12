import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function SettingsStackLayout() {
  const { isHydrated, isAuthenticated } = useAuth();

  if (!isHydrated) {
    return null;
  }
  if (!isAuthenticated) {
    return <Redirect href="/signup" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  );
}


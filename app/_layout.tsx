import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useMemo } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProviderRoot } from '@/lib/auth-context';
import { AppThemeProvider, useAppTheme } from '@/lib/app-theme-context';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const colorScheme = useColorScheme();
  const { activeTheme } = useAppTheme();

  const lightTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        primary: activeTheme.colors.accent,
        background: activeTheme.colors.background,
        card: activeTheme.colors.surface,
        text: activeTheme.colors.text,
        border: activeTheme.colors.border,
        notification: activeTheme.colors.accent,
      },
    }),
    [activeTheme]
  );

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : lightTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="signup" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProviderRoot>
      <AppThemeProvider>
        <RootNavigation />
      </AppThemeProvider>
    </AuthProviderRoot>
  );
}

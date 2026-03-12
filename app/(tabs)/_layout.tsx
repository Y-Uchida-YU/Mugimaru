import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { getEventsText } from '@/lib/events-l10n';
import { getAppText } from '@/lib/i18n';
import { getSettingsText } from '@/lib/settings-l10n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { activeTheme } = useAppTheme();
  const { isHydrated, isAuthenticated } = useAuth();
  const text = getAppText();
  const eventsText = getEventsText();
  const settingsText = getSettingsText();

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/signup" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:
          colorScheme === 'dark' ? Colors.dark.tint : activeTheme.colors.accent,
        tabBarInactiveTintColor:
          colorScheme === 'dark' ? Colors.dark.tabIconDefault : activeTheme.colors.mutedText,
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? Colors.dark.background : activeTheme.colors.surface,
          borderTopColor: colorScheme === 'dark' ? '#2c2e31' : activeTheme.colors.border,
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: text.tabs.board,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="text.bubble.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: text.tabs.map,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: eventsText.tabLabel,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: settingsText.tabLabel,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

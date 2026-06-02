import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAppText } from '@/lib/i18n';

export default function TabLayout() {
  const { activeTheme, typography } = useAppTheme();
  const { isHydrated, isAuthenticated } = useAuth();
  const text = getAppText();
  const isJapan = text.localeGroup === 'japan';

  if (!isHydrated) return null;
  if (!isAuthenticated) return <Redirect href="/signup" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: activeTheme.colors.accent,
        tabBarInactiveTintColor: activeTheme.colors.mutedText,
        tabBarStyle: {
          backgroundColor: activeTheme.colors.surface,
          borderTopColor: activeTheme.colors.border,
          minHeight: 64,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontFamily,
          fontSize: 12 * typography.scale,
          fontWeight: '700',
        },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isJapan ? 'ホーム' : 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="text.bubble.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: isJapan ? 'マップ' : 'Map',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: isJapan ? 'イベント' : 'Events',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: isJapan ? '設定' : 'Settings',
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

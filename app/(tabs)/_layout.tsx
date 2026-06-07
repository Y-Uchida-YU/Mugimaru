import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { SelfAvatarButton } from '@/components/self-avatar-button';
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
        headerShown: true,
        headerTitle: '',
        headerTitleAlign: 'left',
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: activeTheme.colors.background,
        },
        headerTitleStyle: {
          color: activeTheme.colors.text,
          fontFamily: typography.fontFamily,
          fontSize: 20 * typography.scale,
          fontWeight: '900',
        },
        headerLeftContainerStyle: {
          paddingLeft: 6,
        },
        headerTitleContainerStyle: {
          marginLeft: -2,
        },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: isJapan ? 'ホーム' : 'Home',
          headerLeft: () => <SelfAvatarButton />,
          headerTitle: isJapan ? 'タイムライン' : 'Timeline',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="text.bubble.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: isJapan ? '通知' : 'Notifications',
          headerTitle: isJapan ? '通知' : 'Notifications',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="bell.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'DM',
          headerTitle: 'DM',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="envelope.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: isJapan ? 'マップ' : 'Map',
          headerLeft: () => <SelfAvatarButton />,
          headerTitle: '',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="map.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: isJapan ? 'イベント' : 'Events',
          headerLeft: () => <SelfAvatarButton />,
          headerTitle: isJapan ? 'イベント' : 'Events',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: isJapan ? '設定' : 'Settings',
          headerShown: false,
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

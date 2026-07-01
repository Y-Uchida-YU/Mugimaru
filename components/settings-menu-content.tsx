import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAppText } from '@/lib/i18n';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { hasSupabaseEnv } from '@/lib/supabase';
import { getFollowCounts } from '@/lib/user-data';

type SettingsMenuContentProps = {
  compact?: boolean;
  onNavigate?: () => void;
};

type RowProps = {
  icon: keyof typeof FontAwesome6.glyphMap;
  title: string;
  onPress: () => void;
};

function SettingsRow({ icon, title, onPress }: RowProps) {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  return (
    <Pressable
      style={styles.row}
      onPress={onPress}
      android_ripple={{ color: `${colors.accent}22` }}>
      <View style={styles.rowIcon}>
        <FontAwesome6 name={icon} size={19} color={colors.text} />
      </View>
      <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
    </Pressable>
  );
}

function MenuAvatar({ uri, label }: { uri?: string | null; label: string }) {
  const parsed = parseAvatarValue(uri ?? '');
  if (parsed.type === 'image') return <Image source={{ uri: parsed.uri }} style={styles.avatarImage} />;
  if (parsed.type === 'icon') {
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarIcon}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>{label.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

export function SettingsMenuContent({ compact = false, onNavigate }: SettingsMenuContentProps) {
  const router = useRouter();
  const text = getAppText();
  const { profile, logout } = useAuth();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const isJapan = text.localeGroup === 'japan';
  const [followCounts, setFollowCounts] = useState({ followers: 0, following: 0 });

  const copy = isJapan
    ? {
        profile: 'プロフィール',
        personal: '個人設定',
        theme: 'テーマカラー',
        textSize: '文字サイズ',
        font: 'フォント',
        settings: '設定とプライバシー',
        help: 'ヘルプ',
        logout: 'ログアウト',
        following: 'フォロー中',
        followers: 'フォロワー',
      }
    : {
        profile: 'Profile',
        personal: 'Personal settings',
        theme: 'Theme color',
        textSize: 'Text size',
        font: 'Font style',
        settings: 'Settings and privacy',
        help: 'Help',
        logout: 'Log out',
        following: 'Following',
        followers: 'Followers',
      };

  useEffect(() => {
    let active = true;

    const loadFollowCounts = async () => {
      if (!profile || !hasSupabaseEnv) {
        setFollowCounts({ followers: 0, following: 0 });
        return;
      }

      try {
        const counts = await getFollowCounts(profile.externalId);
        if (active) setFollowCounts(counts);
      } catch {
        if (active) setFollowCounts({ followers: 0, following: 0 });
      }
    };

    void loadFollowCounts();
    return () => {
      active = false;
    };
  }, [profile]);

  const open = (path: string) => {
    onNavigate?.();
    router.push(path as never);
  };

  const handleLogout = () => {
    onNavigate?.();
    logout();
    router.replace('/signup');
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.compactContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.profileBlock}>
          <MenuAvatar uri={profile?.avatarUrl} label={displayProfileName()} />
          <Text style={[styles.profileName, { color: colors.text }]} numberOfLines={1}>
            {displayProfileName()}
          </Text>
          <View style={styles.followRow}>
            <Pressable onPress={() => open(`/follows?user=${encodeURIComponent(profile?.externalId ?? '')}&type=following`)}>
              <Text style={[styles.followText, { color: colors.text }]}>
                {followCounts.following.toLocaleString()} <Text style={{ color: colors.mutedText }}>{copy.following}</Text>
              </Text>
            </Pressable>
            <Pressable onPress={() => open(`/follows?user=${encodeURIComponent(profile?.externalId ?? '')}&type=followers`)}>
              <Text style={[styles.followText, { color: colors.text }]}>
                {followCounts.followers.toLocaleString()} <Text style={{ color: colors.mutedText }}>{copy.followers}</Text>
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.primaryMenu}>
          <SettingsRow icon="user" title={copy.profile} onPress={() => open('/me')} />
          <SettingsRow icon="user-gear" title={copy.personal} onPress={() => open('/settings/personal')} />
          <SettingsRow icon="palette" title={copy.theme} onPress={() => open('/settings/theme')} />
          <SettingsRow icon="text-height" title={copy.textSize} onPress={() => open('/settings/text')} />
          <SettingsRow icon="font" title={copy.font} onPress={() => open('/settings/font')} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <View style={styles.secondaryMenu}>
          <SettingsRow icon="gear" title={copy.settings} onPress={() => open('/settings/personal')} />
          <SettingsRow icon="circle-question" title={copy.help} onPress={() => open('/settings/help')} />
          <SettingsRow icon="right-from-bracket" title={copy.logout} onPress={handleLogout} />
        </View>
      </ScrollView>
    </View>
  );

  function displayProfileName() {
    const dogName = profile?.dogName?.trim();
    if (dogName) return dogName;

    const name = profile?.name?.trim();
    const providerDefaultNames = new Set(['Appleユーザー', 'Apple User', 'LINEユーザー', 'Googleユーザー', 'Xユーザー', 'ユーザー']);
    if (name && !providerDefaultNames.has(name)) return name;

    return isJapan ? 'プロフィール' : 'Profile';
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 32 },
  compactContent: { paddingHorizontal: 20, paddingTop: 0, paddingBottom: 24 },
  profileBlock: { paddingBottom: 22 },
  avatarImage: { width: 48, height: 48, borderRadius: 24, marginBottom: 10 },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: '#eadfce',
  },
  avatarIcon: { fontSize: 25 },
  avatarInitial: { color: '#6b4f2f', fontSize: 18, fontWeight: '900' },
  profileName: { fontSize: 19, fontWeight: '900', lineHeight: 24 },
  followRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  followText: { fontSize: 13, fontWeight: '900' },
  primaryMenu: { gap: 2 },
  secondaryMenu: { gap: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 20 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 18 },
  rowIcon: { width: 30, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '900' },
});

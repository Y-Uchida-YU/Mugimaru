import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';

type RowProps = {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  value?: string;
  textColor: string;
  mutedColor: string;
  borderColor: string;
};

function Row({ icon, title, subtitle, onPress, value, textColor, mutedColor, borderColor }: RowProps) {
  return (
    <Pressable style={[styles.row, { borderBottomColor: borderColor }]} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: textColor }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: mutedColor }]}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={[styles.rowValue, { color: mutedColor }]}>{value}</Text> : null}
      <Text style={styles.rowChevron}>{'>'}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const fontFamily = typography.fontFamily;

  const handleLogout = () => {
    logout();
    router.replace('/signup');
  };
  const openSettingsScreen = (path: string) => {
    router.push(path as never);
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets>
        <View style={styles.headerRow}>
          <Text style={[styles.headerTitle, { color: colors.text, fontFamily }]}>設定</Text>
          <Pressable
            style={[styles.helpButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => openSettingsScreen('/settings/help')}>
            <Text style={[styles.helpButtonText, { color: colors.text, fontFamily }]}>ヘルプ</Text>
          </Pressable>
        </View>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="👤"
            title="個人設定"
            subtitle="連絡先、通知、言語を管理"
            onPress={() => openSettingsScreen('/settings/personal')}
            textColor={colors.text}
            mutedColor={colors.mutedText}
            borderColor={colors.border}
          />
          <Row
            icon="🐾"
            title="プロフィール"
            subtitle="掲示板に表示するプロフィールを編集"
            onPress={() => openSettingsScreen('/settings/profile')}
            textColor={colors.text}
            mutedColor={colors.mutedText}
            borderColor={colors.border}
          />
        </View>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Row
            icon="🎨"
            title="テーマカラー"
            subtitle="アプリ全体の配色を変更"
            value={activeTheme.name}
            onPress={() => openSettingsScreen('/settings/theme')}
            textColor={colors.text}
            mutedColor={colors.mutedText}
            borderColor={colors.border}
          />
          <Row
            icon="Aa"
            title="文字設定"
            subtitle="文字サイズを調整"
            onPress={() => openSettingsScreen('/settings/text')}
            textColor={colors.text}
            mutedColor={colors.mutedText}
            borderColor={colors.border}
          />
          <Row
            icon="𝓕"
            title="フォントスタイル"
            subtitle="本文のフォントテイストを変更"
            onPress={() => openSettingsScreen('/settings/font')}
            textColor={colors.text}
            mutedColor={colors.mutedText}
            borderColor={colors.border}
          />
        </View>

        <View style={[styles.accountCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.accountLabel, { color: colors.mutedText, fontFamily }]}>ログイン中</Text>
          <Text style={[styles.accountName, { color: colors.text, fontFamily }]}>{profile?.name ?? 'Guest'}</Text>
          <Text style={[styles.accountMeta, { color: colors.mutedText, fontFamily }]}>
            {profile?.email?.trim() ? profile.email : 'メール未設定'}
          </Text>
        </View>

        <Pressable
          style={[styles.logoutButton, { backgroundColor: colors.accent, borderColor: colors.border }]}
          onPress={handleLogout}>
          <Text style={[styles.logoutButtonText, { color: colors.accentContrast, fontFamily }]}>ログアウト</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 14,
  },
  headerRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    flexShrink: 1,
  },
  helpButton: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  rowIcon: {
    fontSize: 18,
    width: 26,
    textAlign: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rowSubtitle: {
    fontSize: 12,
  },
  rowValue: {
    fontSize: 12,
    marginRight: 6,
    maxWidth: 90,
  },
  rowChevron: {
    fontSize: 18,
    color: '#747c88',
    fontWeight: '600',
  },
  accountCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 3,
  },
  accountLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  accountName: {
    fontSize: 18,
    fontWeight: '800',
  },
  accountMeta: {
    fontSize: 12,
  },
  logoutButton: {
    minHeight: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';

type SettingsRowProps = {
  icon: keyof typeof FontAwesome6.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  value?: string;
};

function SettingsRow({ icon, title, subtitle, onPress, value }: SettingsRowProps) {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;

  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      android_ripple={{ color: `${colors.accent}22` }}>
      <View style={[styles.rowIconWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <FontAwesome6 name={icon} size={16} color={colors.text} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: colors.mutedText }]}>{subtitle}</Text>
      </View>
      {value ? <Text style={[styles.rowValue, { color: colors.mutedText }]}>{value}</Text> : null}
      <FontAwesome6 name="chevron-right" size={14} color={colors.mutedText} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, logout } = useAuth();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;

  const open = (path: string) => {
    router.push(path as never);
  };

  const handleLogout = () => {
    logout();
    router.replace('/signup');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.header}>
          <View style={styles.headerTextBlock}>
            <Text style={[styles.headerEyebrow, { color: colors.mutedText }]}>Settings</Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>設定</Text>
            <Text style={[styles.headerCaption, { color: colors.mutedText }]}>
              アカウント、掲示板プロフィール、表示テーマをここから管理します。
            </Text>
          </View>
          <Pressable
            style={[styles.helpChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => open('/settings/help')}>
            <FontAwesome6 name="circle-question" size={14} color={colors.text} />
            <Text style={[styles.helpChipText, { color: colors.text }]}>ヘルプ</Text>
          </Pressable>
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileTopRow}>
            <View style={[styles.avatarShell, { backgroundColor: colors.chip, borderColor: colors.border }]}>
              <FontAwesome6 name="paw" size={22} color={colors.chipText} />
            </View>
            <View style={styles.profileMeta}>
              <Text style={[styles.profileName, { color: colors.text }]}>{profile?.name ?? 'Guest'}</Text>
              <Text style={[styles.profileEmail, { color: colors.mutedText }]}>
                {profile?.email?.trim() ? profile.email : 'メールアドレス未設定'}
              </Text>
            </View>
          </View>
          <View style={styles.profileInfoRow}>
            <View style={[styles.profileInfoPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.profileInfoLabel, { color: colors.mutedText }]}>ログイン</Text>
              <Text style={[styles.profileInfoValue, { color: colors.text }]}>{profile?.provider ?? 'guest'}</Text>
            </View>
            <View style={[styles.profileInfoPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.profileInfoLabel, { color: colors.mutedText }]}>テーマ</Text>
              <Text style={[styles.profileInfoValue, { color: colors.text }]}>{activeTheme.name}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon="user-gear"
            title="個人設定"
            subtitle="通知、メール、利用環境などの設定"
            onPress={() => open('/settings/personal')}
          />
          <SettingsRow
            icon="id-card"
            title="プロフィール"
            subtitle="掲示板で表示する名前、自己紹介、犬情報"
            onPress={() => open('/settings/profile')}
          />
        </View>

        <View style={[styles.groupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SettingsRow
            icon="palette"
            title="テーマカラー"
            subtitle="アプリ全体の色味を切り替え"
            value={activeTheme.name}
            onPress={() => open('/settings/theme')}
          />
          <SettingsRow
            icon="text-height"
            title="文字サイズ"
            subtitle="読みやすさに合わせて表示サイズを調整"
            onPress={() => open('/settings/text')}
          />
          <SettingsRow
            icon="font"
            title="フォントスタイル"
            subtitle="システム、丸み、セリフ、等幅から選択"
            onPress={() => open('/settings/font')}
          />
        </View>

        <Pressable
          style={[styles.logoutButton, { backgroundColor: colors.accent, borderColor: colors.border }]}
          onPress={handleLogout}>
          <FontAwesome6 name="right-from-bracket" size={16} color={colors.accentContrast} />
          <Text style={[styles.logoutText, { color: colors.accentContrast }]}>ログアウト</Text>
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
    gap: 16,
  },
  header: {
    gap: 14,
  },
  headerTextBlock: {
    gap: 4,
  },
  headerEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
  },
  headerCaption: {
    fontSize: 13,
    lineHeight: 20,
    maxWidth: 420,
  },
  helpChip: {
    alignSelf: 'flex-start',
    minHeight: 38,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  helpChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  profileCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarShell: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 19,
    fontWeight: '800',
  },
  profileEmail: {
    fontSize: 12,
  },
  profileInfoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  profileInfoPill: {
    flex: 1,
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 3,
  },
  profileInfoLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  profileInfoValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  groupCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    minHeight: 76,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
  },
  rowIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  rowSubtitle: {
    fontSize: 12,
    lineHeight: 18,
  },
  rowValue: {
    maxWidth: 100,
    fontSize: 12,
    marginRight: 6,
  },
  logoutButton: {
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '800',
  },
});

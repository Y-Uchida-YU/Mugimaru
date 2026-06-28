import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAppText } from '@/lib/i18n';

type SettingsMenuContentProps = {
  compact?: boolean;
  onNavigate?: () => void;
};

type RowProps = {
  icon: keyof typeof FontAwesome6.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
  value?: string;
};

function SettingsRow({ icon, title, subtitle, value, onPress }: RowProps) {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  return (
    <Pressable
      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      android_ripple={{ color: `${colors.accent}22` }}>
      <View style={[styles.rowIcon, { backgroundColor: colors.chip }]}>
        <FontAwesome6 name={icon} size={15} color={colors.chipText} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowSubtitle, { color: colors.mutedText }]}>{subtitle}</Text>
      </View>
      {value ? <Text style={[styles.rowValue, { color: colors.mutedText }]}>{value}</Text> : null}
      <FontAwesome6 name="chevron-right" size={13} color={colors.mutedText} />
    </Pressable>
  );
}

export function SettingsMenuContent({ compact = false, onNavigate }: SettingsMenuContentProps) {
  const router = useRouter();
  const text = getAppText();
  const { profile, logout } = useAuth();
  const { activeTheme, typography, textScale, fontStyle } = useAppTheme();
  const colors = activeTheme.colors;
  const isJapan = text.localeGroup === 'japan';

  const copy = isJapan
    ? {
        title: '設定',
        caption: 'アカウント、プロフィール、見た目をまとめて管理できます。',
        account: 'アカウント',
        appearance: '表示とテーマ',
        support: 'サポート',
        personal: '個人設定',
        personalSub: '通知、メール、利用環境の設定',
        profile: 'プロフィール',
        profileSub: 'アイコン、ヘッダー、愛犬情報、自己紹介',
        theme: 'テーマカラー',
        themeSub: 'アプリ全体の色味を変更',
        textSize: '文字サイズ',
        textSizeSub: '読みやすい表示サイズへ調整',
        font: 'フォント',
        fontSub: 'システム、丸み、セリフ、等幅から選択',
        help: 'ヘルプ',
        helpSub: '使い方とよくある質問',
        loginMethod: 'ログイン',
        logout: 'ログアウト',
      }
    : {
        title: 'Settings',
        caption: 'Manage account, profile, appearance, and support.',
        account: 'Account',
        appearance: 'Appearance',
        support: 'Support',
        personal: 'Personal settings',
        personalSub: 'Notifications, email, and account environment',
        profile: 'Profile',
        profileSub: 'Name, bio, and dog info shown on the board',
        theme: 'Theme color',
        themeSub: 'Change the whole app palette',
        textSize: 'Text size',
        textSizeSub: 'Tune readability and density',
        font: 'Font style',
        fontSub: 'System, rounded, serif, or mono',
        help: 'Help',
        helpSub: 'How to use Mugimaru and FAQ',
        loginMethod: 'Login',
        logout: 'Log out',
      };

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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: compact ? colors.elevated : colors.background }]} edges={compact ? ['top', 'bottom'] : undefined}>
      <ScrollView contentContainerStyle={[styles.content, compact && styles.compactContent]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.eyebrow, { color: colors.accent }]}>{copy.account}</Text>
          <Text style={[styles.title, compact && styles.compactTitle, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.caption, { color: colors.mutedText }]}>{copy.caption}</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <View style={styles.profileTop}>
            <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FontAwesome6 name="paw" size={22} color={colors.accent} />
            </View>
            <View style={styles.profileMeta}>
              <Text style={[styles.profileName, { color: colors.text }]}>{profile?.dogName || profile?.name || 'ゲスト'}</Text>
            </View>
            <Pressable style={[styles.editButton, { backgroundColor: colors.surface }]} onPress={() => open('/settings/profile')}>
              <FontAwesome6 name="pen" size={13} color={colors.text} />
            </Pressable>
          </View>
          <View style={styles.statsRow}>
            <Metric label={copy.loginMethod} value={providerLabel(profile?.provider)} />
            <Metric label={copy.theme} value={activeTheme.name} />
            <Metric label={copy.textSize} value={textScale} />
          </View>
        </View>

        <SectionTitle title={copy.account} />
        <SettingsRow icon="user-gear" title={copy.personal} subtitle={copy.personalSub} onPress={() => open('/settings/personal')} />
        <SettingsRow icon="id-card" title={copy.profile} subtitle={copy.profileSub} onPress={() => open('/settings/profile')} />

        <SectionTitle title={copy.appearance} />
        <SettingsRow icon="palette" title={copy.theme} subtitle={copy.themeSub} value={activeTheme.name} onPress={() => open('/settings/theme')} />
        <SettingsRow icon="text-height" title={copy.textSize} subtitle={copy.textSizeSub} value={textScale} onPress={() => open('/settings/text')} />
        <SettingsRow icon="font" title={copy.font} subtitle={copy.fontSub} value={fontStyle} onPress={() => open('/settings/font')} />

        <SectionTitle title={copy.support} />
        <SettingsRow icon="circle-question" title={copy.help} subtitle={copy.helpSub} onPress={() => open('/settings/help')} />

        <Pressable style={[styles.logoutButton, { backgroundColor: colors.accent }]} onPress={handleLogout}>
          <FontAwesome6 name="right-from-bracket" size={15} color={colors.accentContrast} />
          <Text style={[styles.logoutText, { color: colors.accentContrast }]}>{copy.logout}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );

  function SectionTitle({ title }: { title: string }) {
    return <Text style={[styles.sectionTitle, { color: colors.mutedText, fontFamily: typography.fontFamily }]}>{title}</Text>;
  }

  function Metric({ label, value }: { label: string; value: string }) {
    return (
      <View style={[styles.metric, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.metricLabel, { color: colors.mutedText }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
    );
  }

  function providerLabel(provider?: string) {
    if (provider === 'line') return 'LINE';
    if (provider === 'google') return 'Google';
    if (provider === 'apple') return 'Apple';
    if (provider === 'x') return 'X';
    if (provider === 'email') return 'メール';
    return 'ゲスト';
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 36, gap: 12 },
  compactContent: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 24 },
  header: { gap: 4, paddingHorizontal: 2 },
  eyebrow: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { fontSize: 32, fontWeight: '800' },
  compactTitle: { fontSize: 28 },
  caption: { fontSize: 13, lineHeight: 20, maxWidth: 460 },
  profileCard: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 14 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 58, height: 58, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileMeta: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '800' },
  editButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metric: { flex: 1, minWidth: 96, minHeight: 58, borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, justifyContent: 'center', gap: 2 },
  metricLabel: { fontSize: 10, fontWeight: '800' },
  metricValue: { fontSize: 13, fontWeight: '800' },
  sectionTitle: { marginTop: 4, paddingHorizontal: 2, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  row: { minHeight: 74, borderRadius: 18, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 15, fontWeight: '800' },
  rowSubtitle: { fontSize: 12, lineHeight: 18 },
  rowValue: { maxWidth: 104, fontSize: 11, fontWeight: '700', textAlign: 'right' },
  logoutButton: { minHeight: 52, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 4 },
  logoutText: { fontSize: 14, fontWeight: '800' },
});

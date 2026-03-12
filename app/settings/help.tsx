import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsPageScaffold, SettingsSection } from '@/app/settings/_shared';
import { useAppTheme } from '@/lib/app-theme-context';

const HELP_ITEMS = [
  {
    title: 'ログインできない場合',
    body: 'SNSログインを切り替える前に、ネットワーク状態と各プロバイダの認証設定を確認してください。',
  },
  {
    title: 'テーマや文字設定が反映されない場合',
    body: '設定変更後にタブを切り替えると即時反映されます。反映されない場合はアプリ再起動を試してください。',
  },
  {
    title: '写真アップロードの権限',
    body: '初回のみ写真ライブラリの権限確認が表示されます。拒否した場合はOS設定から許可が必要です。',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;

  return (
    <SettingsPageScaffold
      title="ヘルプ"
      subtitle="よくある質問と設定のヒント"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}
    >
      <SettingsSection theme={activeTheme} typography={typography} title="FAQ">
        {HELP_ITEMS.map((item) => (
          <View key={item.title} style={[styles.itemCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Text style={[styles.itemTitle, { color: colors.text, fontFamily: typography.fontFamily }]}>
              {item.title}
            </Text>
            <Text style={[styles.itemBody, { color: colors.mutedText, fontFamily: typography.fontFamily }]}>
              {item.body}
            </Text>
          </View>
        ))}
      </SettingsSection>
    </SettingsPageScaffold>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemBody: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '500',
  },
});


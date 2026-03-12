import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsOptionCard, SettingsPageScaffold, SettingsSection } from '@/app/settings/_shared';
import { FONT_STYLE_OPTIONS, useAppTheme } from '@/lib/app-theme-context';

export default function FontStyleSettingsScreen() {
  const router = useRouter();
  const { activeTheme, typography, fontStyle, setFontStyle } = useAppTheme();
  const colors = activeTheme.colors;

  return (
    <SettingsPageScaffold
      title="フォントスタイル"
      subtitle="本文テキストの雰囲気を切り替え"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}
    >
      <SettingsSection theme={activeTheme} typography={typography} title="スタイル選択">
        {FONT_STYLE_OPTIONS.map((option) => (
          <SettingsOptionCard
            key={option.id}
            label={option.label}
            description={option.description}
            selected={fontStyle === option.id}
            onPress={() => setFontStyle(option.id)}
            theme={activeTheme}
            typography={typography}
          />
        ))}
      </SettingsSection>

      <SettingsSection theme={activeTheme} typography={typography} title="フォントプレビュー">
        <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text
            style={[
              styles.previewHeading,
              {
                color: colors.text,
                fontFamily: typography.fontFamily,
                fontSize: 18 * typography.scale,
              },
            ]}>
            Mugimaru Community
          </Text>
          <Text
            style={[
              styles.previewBody,
              {
                color: colors.mutedText,
                fontFamily: typography.fontFamily,
                fontSize: 13 * typography.scale,
              },
            ]}>
            新しい散歩ルートの投稿、写真共有、コメントの読みやすさを、フォントスタイルを変えながら確認できます。
          </Text>
        </View>
      </SettingsSection>
    </SettingsPageScaffold>
  );
}

const styles = StyleSheet.create({
  previewCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  previewHeading: {
    fontWeight: '800',
  },
  previewBody: {
    lineHeight: 22,
    fontWeight: '500',
  },
});


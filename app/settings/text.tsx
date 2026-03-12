import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { SettingsOptionCard, SettingsPageScaffold, SettingsSection } from '@/app/settings/_shared';
import { TEXT_SCALE_OPTIONS, useAppTheme } from '@/lib/app-theme-context';

export default function TextSettingsScreen() {
  const router = useRouter();
  const { activeTheme, typography, textScale, setTextScale } = useAppTheme();
  const colors = activeTheme.colors;

  return (
    <SettingsPageScaffold
      title="文字設定"
      subtitle="読みやすさに合わせて文字サイズを調整"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}
    >
      <SettingsSection theme={activeTheme} typography={typography} title="文字サイズ">
        {TEXT_SCALE_OPTIONS.map((option) => (
          <SettingsOptionCard
            key={option.id}
            label={option.label}
            description={option.description}
            selected={textScale === option.id}
            onPress={() => setTextScale(option.id)}
            theme={activeTheme}
            typography={typography}
          />
        ))}
      </SettingsSection>

      <SettingsSection theme={activeTheme} typography={typography} title="読みやすさプレビュー">
        <View style={[styles.previewCard, { borderColor: colors.border, backgroundColor: colors.background }]}>
          <Text
            style={[
              styles.previewHeading,
              {
                color: colors.text,
                fontSize: 18 * typography.scale,
                fontFamily: typography.fontFamily,
              },
            ]}>
            今日のおすすめ散歩スポット
          </Text>
          <Text
            style={[
              styles.previewBody,
              {
                color: colors.mutedText,
                fontSize: 13 * typography.scale,
                fontFamily: typography.fontFamily,
              },
            ]}>
            夕方は風が気持ち良いので、芝生の広場ルートがおすすめです。文字サイズを変更しながら、読みやすさを確認できます。
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


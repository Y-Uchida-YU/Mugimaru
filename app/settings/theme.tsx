import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SettingsOptionCard, SettingsPageScaffold, SettingsSection } from '@/app/settings/_shared';
import { useAppTheme } from '@/lib/app-theme-context';

export default function ThemeSettingsScreen() {
  const router = useRouter();
  const { themes, activeTheme, setActiveThemeById, typography } = useAppTheme();
  const colors = activeTheme.colors;

  return (
    <SettingsPageScaffold
      title="テーマカラー"
      subtitle="アプリ全体の色味を一括で切り替え"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}
    >
      <SettingsSection theme={activeTheme} typography={typography} title="テーマ一覧">
        {themes.map((theme) => {
          const selected = theme.id === activeTheme.id;
          return (
            <SettingsOptionCard
              key={theme.id}
              label={theme.name}
              description={theme.description}
              selected={selected}
              onPress={() => setActiveThemeById(theme.id)}
              theme={activeTheme}
              typography={typography}
              preview={
                <View style={styles.previewSwatchRow}>
                  <View style={[styles.previewSwatch, { backgroundColor: theme.colors.accent }]} />
                  <View style={[styles.previewSwatch, { backgroundColor: theme.colors.surface }]} />
                  <View style={[styles.previewSwatch, { backgroundColor: theme.colors.elevated }]} />
                </View>
              }
            />
          );
        })}
      </SettingsSection>

      <SettingsSection theme={activeTheme} typography={typography} title="プレビュー">
        <View style={[styles.previewCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <Text style={[styles.previewTitle, { color: colors.text, fontFamily: typography.fontFamily }]}>
            Mugimaru Preview
          </Text>
          <Text style={[styles.previewCaption, { color: colors.mutedText, fontFamily: typography.fontFamily }]}>
            現在のテーマ: {activeTheme.name}
          </Text>
          <Pressable style={[styles.previewButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.previewButtonText, { color: colors.accentContrast, fontFamily: typography.fontFamily }]}>
              アクションボタン
            </Text>
          </Pressable>
        </View>
      </SettingsSection>
    </SettingsPageScaffold>
  );
}

const styles = StyleSheet.create({
  previewSwatchRow: {
    flexDirection: 'row',
    gap: 5,
  },
  previewSwatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  previewTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  previewCaption: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewButton: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  previewButtonText: {
    fontSize: 13,
    fontWeight: '800',
  },
});


import { type PropsWithChildren, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type AppTypography, type AppTheme } from '@/lib/app-theme-context';

type PageScaffoldProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  theme: AppTheme;
  typography: AppTypography;
  onBack?: () => void;
  rightAction?: ReactNode;
}>;

export function SettingsPageScaffold({
  title,
  subtitle,
  theme,
  typography,
  onBack,
  rightAction,
  children,
}: PageScaffoldProps) {
  const colors = theme.colors;
  const fontFamily = typography.fontFamily;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          {onBack ? (
            <Pressable
              style={[styles.backButton, { borderColor: colors.border, backgroundColor: colors.surface }]}
              onPress={onBack}>
              <Text style={[styles.backButtonText, { color: colors.text, fontFamily }]}>{'<'}</Text>
            </Pressable>
          ) : (
            <View style={styles.backButtonPlaceholder} />
          )}
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.text, fontFamily }]}>{title}</Text>
            {subtitle ? <Text style={[styles.headerSubtitle, { color: colors.mutedText, fontFamily }]}>{subtitle}</Text> : null}
          </View>
          <View style={styles.rightActionWrap}>{rightAction}</View>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingsSectionProps = PropsWithChildren<{
  theme: AppTheme;
  title?: string;
  typography: AppTypography;
}>;

export function SettingsSection({ children, theme, title, typography }: SettingsSectionProps) {
  const colors = theme.colors;
  return (
    <View style={styles.sectionWrap}>
      {title ? (
        <Text style={[styles.sectionTitle, { color: colors.mutedText, fontFamily: typography.fontFamily }]}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>{children}</View>
    </View>
  );
}

type SettingsOptionCardProps = {
  label: string;
  description: string;
  selected?: boolean;
  onPress: () => void;
  theme: AppTheme;
  typography: AppTypography;
  preview?: ReactNode;
};

export function SettingsOptionCard({
  label,
  description,
  selected,
  onPress,
  theme,
  typography,
  preview,
}: SettingsOptionCardProps) {
  const colors = theme.colors;
  return (
    <Pressable
      style={[
        styles.optionCard,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? colors.chip : colors.background,
        },
      ]}
      onPress={onPress}>
      <View style={styles.optionTextWrap}>
        <Text style={[styles.optionLabel, { color: colors.text, fontFamily: typography.fontFamily }]}>{label}</Text>
        <Text style={[styles.optionDescription, { color: colors.mutedText, fontFamily: typography.fontFamily }]}>
          {description}
        </Text>
      </View>
      {preview ? <View>{preview}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  headerRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: -2,
  },
  backButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  headerTitleWrap: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  rightActionWrap: {
    minWidth: 36,
    alignItems: 'flex-end',
  },
  sectionWrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 2,
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  optionCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  optionDescription: {
    fontSize: 12,
    fontWeight: '500',
  },
});


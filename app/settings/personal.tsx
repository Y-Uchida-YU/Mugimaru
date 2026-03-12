import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { SettingsPageScaffold, SettingsSection } from '@/app/settings/_shared';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import {
  DEFAULT_PERSONAL_PREFS,
  loadPersonalPreferences,
  savePersonalPreferences,
  type PersonalPreferences,
} from '@/lib/settings-preferences';

function providerLabel(provider: string | undefined) {
  if (!provider) return '-';
  if (provider === 'email') return 'Email';
  if (provider === 'line') return 'LINE';
  if (provider === 'google') return 'Google';
  if (provider === 'apple') return 'Apple';
  if (provider === 'guest') return 'Guest';
  return 'X';
}

export default function PersonalSettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const fontFamily = typography.fontFamily;
  const scale = typography.scale;

  const [email, setEmail] = useState(profile?.email ?? '');
  const [prefs, setPrefs] = useState<PersonalPreferences>(DEFAULT_PERSONAL_PREFS);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmail(profile?.email ?? '');
  }, [profile?.email]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      const loaded = await loadPersonalPreferences();
      if (!active) return;
      setPrefs(loaded);
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const languageLabel = useMemo(() => {
    if (prefs.language === 'ja') return '日本語';
    if (prefs.language === 'en') return 'English';
    return '自動';
  }, [prefs.language]);

  const handleSave = async () => {
    if (!profile) return;
    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
      if (!validEmail) {
        setMessage('メール形式が正しくありません。');
        return;
      }
    }

    try {
      setSaving(true);
      await updateProfile({
        name: profile.name,
        email: trimmedEmail,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        dogName: profile.dogName,
        dogBreed: profile.dogBreed,
      });
      await savePersonalPreferences(prefs);
      setMessage('個人設定を保存しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageScaffold
      title="個人設定"
      subtitle="通知、連絡先、言語の基本設定"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}
    >
      <SettingsSection theme={activeTheme} typography={typography} title="アカウント">
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>ログイン方法</Text>
          <Text style={[styles.valueText, { color: colors.text, fontFamily, fontSize: 15 * scale }]}>
            {providerLabel(profile?.provider)}
          </Text>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>メールアドレス</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
                fontFamily,
                fontSize: 14 * scale,
              },
            ]}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.mutedText}
          />
        </View>
      </SettingsSection>

      <SettingsSection theme={activeTheme} typography={typography} title="通知 / 利用体験">
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text, fontFamily, fontSize: 14 * scale }]}>プッシュ通知</Text>
          <Switch
            value={prefs.pushEnabled}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, pushEnabled: value }))}
            trackColor={{ false: '#6d778a', true: colors.accent }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text, fontFamily, fontSize: 14 * scale }]}>週次ダイジェスト</Text>
          <Switch
            value={prefs.weeklyDigestEnabled}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, weeklyDigestEnabled: value }))}
            trackColor={{ false: '#6d778a', true: colors.accent }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.text, fontFamily, fontSize: 14 * scale }]}>マップヒント表示</Text>
          <Switch
            value={prefs.mapHintEnabled}
            onValueChange={(value) => setPrefs((prev) => ({ ...prev, mapHintEnabled: value }))}
            trackColor={{ false: '#6d778a', true: colors.accent }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>表示言語</Text>
          <View style={styles.languageRow}>
            {[
              { id: 'auto', label: '自動' },
              { id: 'ja', label: '日本語' },
              { id: 'en', label: 'English' },
            ].map((item) => {
              const selected = prefs.language === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.langChip,
                    {
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accent : colors.background,
                    },
                  ]}
                  onPress={() => setPrefs((prev) => ({ ...prev, language: item.id as PersonalPreferences['language'] }))}>
                  <Text
                    style={[
                      styles.langChipText,
                      {
                        color: selected ? colors.accentContrast : colors.text,
                        fontFamily,
                        fontSize: 12 * scale,
                      },
                    ]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.inlineMeta, { color: colors.mutedText, fontFamily, fontSize: 11 * scale }]}>
            現在: {languageLabel}
          </Text>
        </View>
      </SettingsSection>

      <Pressable
        style={[styles.saveButton, { backgroundColor: colors.accent }]}
        onPress={() => void handleSave()}
        disabled={saving}>
        <Text style={[styles.saveButtonText, { color: colors.accentContrast, fontFamily }]}>
          {saving ? '保存中...' : '保存する'}
        </Text>
      </Pressable>
      {message ? <Text style={[styles.messageText, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>{message}</Text> : null}
    </SettingsPageScaffold>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontWeight: '700',
  },
  valueText: {
    fontWeight: '700',
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  switchRow: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(140,140,140,0.2)',
    paddingHorizontal: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  switchLabel: {
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  languageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  langChip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langChipText: {
    fontWeight: '700',
  },
  inlineMeta: {
    fontWeight: '600',
    marginTop: 2,
  },
  saveButton: {
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  messageText: {
    marginTop: -4,
    fontWeight: '600',
  },
});


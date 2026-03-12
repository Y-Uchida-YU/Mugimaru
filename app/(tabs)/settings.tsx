import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { pickImageFromLibrary } from '@/lib/mobile-image-picker';
import { getSettingsText } from '@/lib/settings-l10n';

const PERSONAL_PREFS_KEY = 'mugimaru.settings.personal-preferences';

type SettingsTab = 'personal' | 'profile' | 'theme';

type PersonalPreferences = {
  pushEnabled: boolean;
  weeklyDigestEnabled: boolean;
  mapHintEnabled: boolean;
  language: 'auto' | 'ja' | 'en';
};

const DEFAULT_PERSONAL_PREFS: PersonalPreferences = {
  pushEnabled: true,
  weeklyDigestEnabled: false,
  mapHintEnabled: true,
  language: 'auto',
};

function isImageValue(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
}

function mapProviderLabel(
  provider: string | undefined,
  labels: { providerEmail: string; providerLine: string; providerX: string }
) {
  if (!provider) return '-';
  if (provider === 'guest') return 'Guest';
  if (provider === 'email') return labels.providerEmail;
  if (provider === 'line') return labels.providerLine;
  if (provider === 'google') return 'Google';
  if (provider === 'apple') return 'Apple';
  return labels.providerX;
}

type MenuRowProps = {
  icon: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
  valueText?: string;
};

function MenuRow({ icon, label, active, onPress, valueText }: MenuRowProps) {
  return (
    <Pressable style={[styles.menuRow, active ? styles.menuRowActive : null]} onPress={onPress} disabled={!onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, active ? styles.menuLabelActive : null]}>{label}</Text>
      {valueText ? <Text style={styles.menuValue}>{valueText}</Text> : null}
      <Text style={styles.menuChevron}>{'>'}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const text = getSettingsText();
  const { profile, updateProfile, logout } = useAuth();
  const { activeTheme, themes, setActiveThemeById } = useAppTheme();

  const [activeTab, setActiveTab] = useState<SettingsTab>('personal');

  const [email, setEmail] = useState(profile?.email ?? '');
  const [boardName, setBoardName] = useState(profile?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [dogName, setDogName] = useState(profile?.dogName ?? '');
  const [dogBreed, setDogBreed] = useState(profile?.dogBreed ?? '');

  const [preferences, setPreferences] = useState<PersonalPreferences>(DEFAULT_PERSONAL_PREFS);

  const [personalMessage, setPersonalMessage] = useState('');
  const [profileMessage, setProfileMessage] = useState('');
  const [themeMessage, setThemeMessage] = useState('');
  const [isSavingPersonal, setSavingPersonal] = useState(false);
  const [isSavingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setEmail(profile?.email ?? '');
    setBoardName(profile?.name ?? '');
    setAvatarUrl(profile?.avatarUrl ?? '');
    setBio(profile?.bio ?? '');
    setDogName(profile?.dogName ?? '');
    setDogBreed(profile?.dogBreed ?? '');
  }, [profile]);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(PERSONAL_PREFS_KEY);
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as Partial<PersonalPreferences>;
        setPreferences({
          pushEnabled: parsed.pushEnabled ?? DEFAULT_PERSONAL_PREFS.pushEnabled,
          weeklyDigestEnabled: parsed.weeklyDigestEnabled ?? DEFAULT_PERSONAL_PREFS.weeklyDigestEnabled,
          mapHintEnabled: parsed.mapHintEnabled ?? DEFAULT_PERSONAL_PREFS.mapHintEnabled,
          language: parsed.language === 'ja' || parsed.language === 'en' ? parsed.language : 'auto',
        });
      } catch {
        // no-op
      }
    };
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  const providerLabel = useMemo(
    () =>
      mapProviderLabel(profile?.provider, {
        providerEmail: text.providerEmail,
        providerLine: text.providerLine,
        providerX: text.providerX,
      }),
    [profile?.provider, text.providerEmail, text.providerLine, text.providerX]
  );

  const previewLetter = (boardName || profile?.name || '?').charAt(0).toUpperCase();
  const previewValue = avatarUrl.trim();

  const savePersonalPreferences = async () => {
    await AsyncStorage.setItem(PERSONAL_PREFS_KEY, JSON.stringify(preferences));
  };

  const handleSavePersonal = async () => {
    const trimmedEmail = email.trim();
    const trimmedBoardName = boardName.trim();
    if (!trimmedBoardName) {
      setPersonalMessage(text.nameRequired);
      return;
    }
    if (trimmedEmail) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
      if (!validEmail) {
        setPersonalMessage(text.emailInvalid);
        return;
      }
    }

    try {
      setSavingPersonal(true);
      await updateProfile({
        name: trimmedBoardName,
        email: trimmedEmail,
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim(),
        dogName: dogName.trim(),
        dogBreed: dogBreed.trim(),
      });
      await savePersonalPreferences();
      setPersonalMessage('Personal settings saved.');
    } catch (error) {
      setPersonalMessage(error instanceof Error ? error.message : text.saveFailed);
    } finally {
      setSavingPersonal(false);
    }
  };

  const handlePickAvatar = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setAvatarUrl(picked.dataUrl);
      setProfileMessage('Photo selected. Save profile to apply.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Failed to pick image.');
    }
  };

  const handleSaveBoardProfile = async () => {
    const trimmedBoardName = boardName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedBoardName) {
      setProfileMessage(text.nameRequired);
      return;
    }
    if (avatarUrl.trim() && !isImageValue(avatarUrl)) {
      setProfileMessage('Profile image must be selected from library or be a valid URL.');
      return;
    }
    if (trimmedEmail) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
      if (!validEmail) {
        setProfileMessage(text.emailInvalid);
        return;
      }
    }

    try {
      setSavingProfile(true);
      await updateProfile({
        name: trimmedBoardName,
        email: trimmedEmail,
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim(),
        dogName: dogName.trim(),
        dogBreed: dogBreed.trim(),
      });
      setProfileMessage(text.saveSuccess);
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : text.saveFailed);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSelectTheme = (themeId: string) => {
    setActiveThemeById(themeId);
    const selected = themes.find((theme) => theme.id === themeId);
    if (selected) {
      setThemeMessage(`Theme switched to ${selected.name}.`);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/signup');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Text style={styles.topTitle}>設定</Text>
          <Pressable>
            <Text style={styles.helpText}>ヘルプ</Text>
          </Pressable>
        </View>

        <View style={styles.groupCard}>
          <MenuRow
            icon="👤"
            label="個人設定"
            active={activeTab === 'personal'}
            onPress={() => setActiveTab('personal')}
          />
          <MenuRow
            icon="🐶"
            label="プロフィール"
            active={activeTab === 'profile'}
            onPress={() => setActiveTab('profile')}
          />
          <MenuRow
            icon="🎨"
            label="テーマカラー"
            active={activeTab === 'theme'}
            onPress={() => setActiveTab('theme')}
            valueText={activeTheme.name}
          />
        </View>

        <View style={styles.groupCard}>
          <MenuRow icon="🧩" label="アプリアイコン" />
          <MenuRow icon="Aa" label="文字設定" />
          <MenuRow icon="A+" label="フォントスタイル" />
        </View>

        {activeTab === 'personal' ? (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>個人設定</Text>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{text.providerLabel}</Text>
              <Text style={styles.formValue}>{providerLabel}</Text>
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>{text.emailLabel}</Text>
              <TextInput
                style={styles.formInput}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#6d7380"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>リマインダー通知</Text>
              <Switch
                value={preferences.pushEnabled}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    pushEnabled: value,
                  }))
                }
                trackColor={{ false: '#3a3d46', true: activeTheme.colors.accent }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>週次ダイジェスト</Text>
              <Switch
                value={preferences.weeklyDigestEnabled}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    weeklyDigestEnabled: value,
                  }))
                }
                trackColor={{ false: '#3a3d46', true: activeTheme.colors.accent }}
                thumbColor="#ffffff"
              />
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>マップ補助表示</Text>
              <Switch
                value={preferences.mapHintEnabled}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    mapHintEnabled: value,
                  }))
                }
                trackColor={{ false: '#3a3d46', true: activeTheme.colors.accent }}
                thumbColor="#ffffff"
              />
            </View>

            <Pressable
              style={[styles.actionButton, { backgroundColor: activeTheme.colors.accent }]}
              onPress={() => void handleSavePersonal()}
              disabled={isSavingPersonal}>
              <Text style={styles.actionButtonText}>保存</Text>
            </Pressable>
            {personalMessage ? <Text style={styles.messageText}>{personalMessage}</Text> : null}
          </View>
        ) : null}

        {activeTab === 'profile' ? (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>プロフィール</Text>

            <View style={styles.avatarRow}>
              {previewValue && isImageValue(previewValue) ? (
                <Image source={{ uri: previewValue }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarFallback, { backgroundColor: activeTheme.colors.accent }]}>
                  <Text style={styles.avatarFallbackText}>{previewLetter || '?'}</Text>
                </View>
              )}
              <View style={styles.avatarActions}>
                <Pressable
                  style={[styles.secondaryButton, { borderColor: activeTheme.colors.accent }]}
                  onPress={() => void handlePickAvatar()}>
                  <Text style={[styles.secondaryButtonText, { color: activeTheme.colors.accent }]}>写真を選択</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => setAvatarUrl('')}>
                  <Text style={styles.secondaryButtonText}>削除</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.formLabel}>表示名</Text>
              <TextInput style={styles.formInput} value={boardName} onChangeText={setBoardName} />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={bio}
                onChangeText={setBio}
                multiline
                textAlignVertical="top"
              />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Dog Name</Text>
              <TextInput style={styles.formInput} value={dogName} onChangeText={setDogName} />
            </View>
            <View style={styles.formRow}>
              <Text style={styles.formLabel}>Dog Breed</Text>
              <TextInput style={styles.formInput} value={dogBreed} onChangeText={setDogBreed} />
            </View>

            <Pressable
              style={[styles.actionButton, { backgroundColor: activeTheme.colors.accent }]}
              onPress={() => void handleSaveBoardProfile()}
              disabled={isSavingProfile}>
              <Text style={styles.actionButtonText}>保存</Text>
            </Pressable>
            {profileMessage ? <Text style={styles.messageText}>{profileMessage}</Text> : null}
          </View>
        ) : null}

        {activeTab === 'theme' ? (
          <View style={styles.panelCard}>
            <Text style={styles.panelTitle}>テーマカラー</Text>
            <View style={styles.themeGrid}>
              {themes.map((theme) => {
                const selected = theme.id === activeTheme.id;
                return (
                  <Pressable
                    key={theme.id}
                    style={[styles.themeCard, selected ? { borderColor: activeTheme.colors.accent } : null]}
                    onPress={() => handleSelectTheme(theme.id)}>
                    <View style={styles.swatchRow}>
                      <View style={[styles.swatch, { backgroundColor: theme.colors.accent }]} />
                      <View style={[styles.swatch, { backgroundColor: theme.colors.surface }]} />
                      <View style={[styles.swatch, { backgroundColor: theme.colors.elevated }]} />
                    </View>
                    <Text style={styles.themeName}>{theme.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            {themeMessage ? <Text style={styles.messageText}>{themeMessage}</Text> : null}
          </View>
        ) : null}

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{text.logoutButton}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080b11',
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 36,
    gap: 16,
  },
  topBar: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    position: 'relative',
    marginBottom: 2,
  },
  topTitle: {
    color: '#f2f5ff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  helpText: {
    position: 'absolute',
    right: 0,
    color: '#f2f5ff',
    fontSize: 16,
    fontWeight: '600',
  },
  groupCard: {
    borderRadius: 16,
    backgroundColor: '#141922',
    borderWidth: 1,
    borderColor: '#222a36',
    overflow: 'hidden',
  },
  menuRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222a36',
    gap: 12,
  },
  menuRowActive: {
    backgroundColor: '#1b2230',
  },
  menuIcon: {
    width: 28,
    color: '#a9b4c7',
    fontSize: 17,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    color: '#f2f5ff',
    fontSize: 15,
    fontWeight: '600',
  },
  menuLabelActive: {
    fontWeight: '800',
  },
  menuValue: {
    color: '#9aa7bc',
    fontSize: 13,
    marginRight: 4,
  },
  menuChevron: {
    color: '#5f6b7f',
    fontSize: 18,
    fontWeight: '600',
  },
  panelCard: {
    borderRadius: 16,
    backgroundColor: '#141922',
    borderWidth: 1,
    borderColor: '#222a36',
    padding: 15,
    gap: 10,
  },
  panelTitle: {
    color: '#f2f5ff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  formRow: {
    gap: 6,
  },
  formLabel: {
    color: '#c7cedc',
    fontSize: 13,
    fontWeight: '600',
  },
  formValue: {
    color: '#f2f5ff',
    fontSize: 15,
    paddingVertical: 4,
  },
  formInput: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3948',
    backgroundColor: '#101620',
    color: '#f2f5ff',
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 90,
  },
  toggleRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3948',
    backgroundColor: '#101620',
    minHeight: 54,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  toggleLabel: {
    color: '#e8ecf6',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    marginTop: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  messageText: {
    color: '#aeb6c7',
    fontSize: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2d3544',
  },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  secondaryButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f3948',
    backgroundColor: '#101620',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#c7cedc',
    fontSize: 13,
    fontWeight: '700',
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  themeCard: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f3948',
    backgroundColor: '#101620',
    padding: 10,
    gap: 6,
  },
  swatchRow: {
    flexDirection: 'row',
    gap: 5,
  },
  swatch: {
    flex: 1,
    height: 10,
    borderRadius: 4,
  },
  themeName: {
    color: '#f2f5ff',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutButton: {
    borderRadius: 12,
    backgroundColor: '#d9534f',
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});

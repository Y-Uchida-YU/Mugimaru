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

export default function SettingsScreen() {
  const router = useRouter();
  const text = getSettingsText();
  const { profile, updateProfile, logout } = useAuth();
  const { activeTheme, themes, setActiveThemeById } = useAppTheme();
  const styles = useMemo(() => createStyles(activeTheme), [activeTheme]);

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
        <View style={styles.heroCard}>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.caption}>{text.caption}</Text>
        </View>

        <View style={styles.tabSwitcher}>
          <Pressable
            style={[styles.tabButton, activeTab === 'personal' ? styles.tabButtonActive : null]}
            onPress={() => setActiveTab('personal')}>
            <Text style={[styles.tabButtonText, activeTab === 'personal' ? styles.tabButtonTextActive : null]}>
              Personal
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'profile' ? styles.tabButtonActive : null]}
            onPress={() => setActiveTab('profile')}>
            <Text style={[styles.tabButtonText, activeTab === 'profile' ? styles.tabButtonTextActive : null]}>
              Board Profile
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'theme' ? styles.tabButtonActive : null]}
            onPress={() => setActiveTab('theme')}>
            <Text style={[styles.tabButtonText, activeTab === 'theme' ? styles.tabButtonTextActive : null]}>
              Theme / Color
            </Text>
          </Pressable>
        </View>

        {activeTab === 'personal' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Personal Settings</Text>

            <Text style={styles.label}>{text.providerLabel}</Text>
            <View style={styles.readonlyBox}>
              <Text style={styles.readonlyText}>{providerLabel}</Text>
            </View>

            <Text style={styles.label}>{text.emailLabel}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrap}>
                <Text style={styles.preferenceTitle}>Push Notifications</Text>
                <Text style={styles.preferenceCaption}>Important updates and reminders.</Text>
              </View>
              <Switch
                value={preferences.pushEnabled}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    pushEnabled: value,
                  }))
                }
                thumbColor={activeTheme.colors.surface}
                trackColor={{ false: activeTheme.colors.border, true: activeTheme.colors.accent }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrap}>
                <Text style={styles.preferenceTitle}>Weekly Digest</Text>
                <Text style={styles.preferenceCaption}>One summary per week by email.</Text>
              </View>
              <Switch
                value={preferences.weeklyDigestEnabled}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    weeklyDigestEnabled: value,
                  }))
                }
                thumbColor={activeTheme.colors.surface}
                trackColor={{ false: activeTheme.colors.border, true: activeTheme.colors.accent }}
              />
            </View>

            <View style={styles.preferenceRow}>
              <View style={styles.preferenceTextWrap}>
                <Text style={styles.preferenceTitle}>Map Hints</Text>
                <Text style={styles.preferenceCaption}>Show nearby helper hints on map.</Text>
              </View>
              <Switch
                value={preferences.mapHintEnabled}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    mapHintEnabled: value,
                  }))
                }
                thumbColor={activeTheme.colors.surface}
                trackColor={{ false: activeTheme.colors.border, true: activeTheme.colors.accent }}
              />
            </View>

            <Text style={styles.label}>Language</Text>
            <View style={styles.languageRow}>
              {[
                { key: 'auto', label: 'Auto' },
                { key: 'ja', label: 'Japanese' },
                { key: 'en', label: 'English' },
              ].map((option) => {
                const active = preferences.language === option.key;
                return (
                  <Pressable
                    key={`language:${option.key}`}
                    style={[styles.languageChip, active ? styles.languageChipActive : null]}
                    onPress={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        language: option.key as PersonalPreferences['language'],
                      }))
                    }>
                    <Text style={[styles.languageChipText, active ? styles.languageChipTextActive : null]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              style={[styles.primaryButton, isSavingPersonal ? styles.primaryButtonDisabled : null]}
              onPress={() => void handleSavePersonal()}
              disabled={isSavingPersonal}>
              <Text style={styles.primaryButtonText}>{text.saveButton}</Text>
            </Pressable>

            {personalMessage ? <Text style={styles.message}>{personalMessage}</Text> : null}
          </View>
        ) : null}

        {activeTab === 'profile' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Board Profile</Text>

            <Text style={styles.label}>Profile Image</Text>
            <View style={styles.avatarRow}>
              {previewValue && isImageValue(previewValue) ? (
                <Image source={{ uri: previewValue }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{previewLetter || '?'}</Text>
                </View>
              )}
              <View style={styles.avatarActions}>
                <Pressable style={styles.photoButton} onPress={() => void handlePickAvatar()}>
                  <Text style={styles.photoButtonText}>Select From Photos</Text>
                </Pressable>
                <Pressable style={styles.photoGhostButton} onPress={() => setAvatarUrl('')}>
                  <Text style={styles.photoGhostButtonText}>Remove</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.label}>Display Name</Text>
            <TextInput style={styles.input} value={boardName} onChangeText={setBoardName} />

            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Introduce yourself"
              placeholderTextColor={activeTheme.colors.mutedText}
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.label}>Dog Name</Text>
            <TextInput
              style={styles.input}
              value={dogName}
              onChangeText={setDogName}
              placeholder="Mugi"
              placeholderTextColor={activeTheme.colors.mutedText}
            />

            <Text style={styles.label}>Dog Breed</Text>
            <TextInput
              style={styles.input}
              value={dogBreed}
              onChangeText={setDogBreed}
              placeholder="Shiba Inu"
              placeholderTextColor={activeTheme.colors.mutedText}
            />

            <Pressable
              style={[styles.primaryButton, isSavingProfile ? styles.primaryButtonDisabled : null]}
              onPress={() => void handleSaveBoardProfile()}
              disabled={isSavingProfile}>
              <Text style={styles.primaryButtonText}>Save Board Profile</Text>
            </Pressable>

            {profileMessage ? <Text style={styles.message}>{profileMessage}</Text> : null}
          </View>
        ) : null}

        {activeTab === 'theme' ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Theme / Color</Text>
            <Text style={styles.themeCaption}>Choose from 20 curated palettes.</Text>

            <View style={styles.themeGrid}>
              {themes.map((theme) => {
                const selected = theme.id === activeTheme.id;
                return (
                  <Pressable
                    key={theme.id}
                    style={[styles.themeCard, selected ? styles.themeCardSelected : null]}
                    onPress={() => handleSelectTheme(theme.id)}>
                    <View style={styles.swatchRow}>
                      <View style={[styles.swatch, { backgroundColor: theme.colors.accent }]} />
                      <View style={[styles.swatch, { backgroundColor: theme.colors.surface }]} />
                      <View style={[styles.swatch, { backgroundColor: theme.colors.elevated }]} />
                    </View>
                    <Text style={styles.themeName}>{theme.name}</Text>
                    <Text style={styles.themeDescription}>{theme.description}</Text>
                  </Pressable>
                );
              })}
            </View>

            {themeMessage ? <Text style={styles.message}>{themeMessage}</Text> : null}
          </View>
        ) : null}

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>{text.logoutButton}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useAppTheme>['activeTheme']) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 28,
      gap: 12,
    },
    heroCard: {
      backgroundColor: theme.colors.elevated,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '800',
    },
    caption: {
      marginTop: 4,
      color: theme.colors.mutedText,
      fontSize: 13,
    },
    tabSwitcher: {
      borderRadius: 14,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 6,
      flexDirection: 'row',
      gap: 6,
    },
    tabButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tabButtonActive: {
      backgroundColor: theme.colors.accent,
    },
    tabButtonText: {
      color: theme.colors.text,
      fontWeight: '600',
      fontSize: 12,
    },
    tabButtonTextActive: {
      color: theme.colors.accentContrast,
      fontWeight: '700',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: 16,
      padding: 14,
      gap: 8,
    },
    sectionTitle: {
      color: theme.colors.text,
      fontSize: 19,
      fontWeight: '800',
      marginBottom: 2,
    },
    label: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '700',
      marginTop: 2,
    },
    readonlyBox: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.elevated,
      paddingHorizontal: 11,
      paddingVertical: 10,
    },
    readonlyText: {
      color: theme.colors.text,
      fontSize: 14,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 10,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 11,
      paddingVertical: 10,
      color: theme.colors.text,
      fontSize: 14,
    },
    textArea: {
      minHeight: 86,
    },
    preferenceRow: {
      marginTop: 2,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.elevated,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    preferenceTextWrap: {
      flex: 1,
      gap: 2,
    },
    preferenceTitle: {
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    preferenceCaption: {
      color: theme.colors.mutedText,
      fontSize: 12,
    },
    languageRow: {
      flexDirection: 'row',
      gap: 8,
    },
    languageChip: {
      flex: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingVertical: 8,
      alignItems: 'center',
      backgroundColor: theme.colors.elevated,
    },
    languageChipActive: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.accent,
    },
    languageChipText: {
      color: theme.colors.text,
      fontSize: 12,
      fontWeight: '700',
    },
    languageChipTextActive: {
      color: theme.colors.accentContrast,
    },
    avatarRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
    },
    avatarImage: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: theme.colors.elevated,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    avatarFallback: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarFallbackText: {
      color: theme.colors.accentContrast,
      fontSize: 24,
      fontWeight: '700',
    },
    avatarActions: {
      flex: 1,
      gap: 8,
    },
    photoButton: {
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    photoButtonText: {
      color: theme.colors.accentContrast,
      fontWeight: '700',
      fontSize: 13,
    },
    photoGhostButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.elevated,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
    },
    photoGhostButtonText: {
      color: theme.colors.text,
      fontWeight: '700',
      fontSize: 13,
    },
    primaryButton: {
      marginTop: 8,
      borderRadius: 10,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      paddingVertical: 11,
    },
    primaryButtonDisabled: {
      opacity: 0.6,
    },
    primaryButtonText: {
      color: theme.colors.accentContrast,
      fontWeight: '700',
      fontSize: 14,
    },
    message: {
      marginTop: 8,
      color: theme.colors.mutedText,
      fontSize: 12,
    },
    themeCaption: {
      color: theme.colors.mutedText,
      fontSize: 13,
      marginBottom: 4,
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
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.elevated,
      padding: 10,
      gap: 6,
    },
    themeCardSelected: {
      borderColor: theme.colors.accent,
      borderWidth: 2,
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
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    themeDescription: {
      color: theme.colors.mutedText,
      fontSize: 11,
      lineHeight: 15,
    },
    logoutButton: {
      borderRadius: 12,
      backgroundColor: '#d9534f',
      paddingVertical: 12,
      alignItems: 'center',
    },
    logoutButtonText: {
      color: '#ffffff',
      fontWeight: '700',
      fontSize: 14,
    },
  });
}

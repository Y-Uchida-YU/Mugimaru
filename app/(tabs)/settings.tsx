import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAuth } from '@/lib/auth-context';
import { pickImageFromLibrary } from '@/lib/mobile-image-picker';
import { getSettingsText } from '@/lib/settings-l10n';

function isImageValue(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
}

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile, logout } = useAuth();
  const text = getSettingsText();

  const [name, setName] = useState(profile?.name ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [dogName, setDogName] = useState(profile?.dogName ?? '');
  const [dogBreed, setDogBreed] = useState(profile?.dogBreed ?? '');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile?.name ?? '');
    setEmail(profile?.email ?? '');
    setAvatarUrl(profile?.avatarUrl ?? '');
    setBio(profile?.bio ?? '');
    setDogName(profile?.dogName ?? '');
    setDogBreed(profile?.dogBreed ?? '');
  }, [profile]);

  const providerLabel = useMemo(() => {
    if (!profile) return '-';
    if (profile.provider === 'guest') return 'Guest';
    if (profile.provider === 'email') return text.providerEmail;
    if (profile.provider === 'line') return text.providerLine;
    return text.providerX;
  }, [profile, text.providerEmail, text.providerLine, text.providerX]);

  const handlePickAvatar = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setAvatarUrl(picked.dataUrl);
      setMessage('Profile photo selected. Save to apply.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to pick image.');
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setMessage(text.nameRequired);
      return;
    }

    if (trimmedEmail) {
      const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
      if (!validEmail) {
        setMessage(text.emailInvalid);
        return;
      }
    }

    if (avatarUrl.trim() && !isImageValue(avatarUrl)) {
      setMessage('Profile image must be selected from library or be a valid URL.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: trimmedName,
        email: trimmedEmail,
        avatarUrl: avatarUrl.trim(),
        bio: bio.trim(),
        dogName: dogName.trim(),
        dogBreed: dogBreed.trim(),
      });
      setMessage(text.saveSuccess);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.replace('/signup');
  };

  const previewValue = avatarUrl.trim();
  const previewLetter = (name || profile?.name || '?').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.title}>{text.title}</Text>
          <Text style={styles.caption}>{text.caption}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.label}>{text.providerLabel}</Text>
          <View style={styles.readonlyBox}>
            <Text style={styles.readonlyText}>{providerLabel}</Text>
          </View>

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

          <Text style={styles.label}>{text.nameLabel}</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>{text.emailLabel}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Introduce yourself"
            multiline
            textAlignVertical="top"
          />

          <Text style={styles.label}>Dog Name</Text>
          <TextInput style={styles.input} value={dogName} onChangeText={setDogName} placeholder="Mugi" />

          <Text style={styles.label}>Dog Breed</Text>
          <TextInput
            style={styles.input}
            value={dogBreed}
            onChangeText={setDogBreed}
            placeholder="Shiba Inu"
          />

          <Pressable
            style={[styles.saveButton, saving ? styles.saveButtonDisabled : null]}
            onPress={handleSave}
            disabled={saving}>
            <Text style={styles.saveButtonText}>{text.saveButton}</Text>
          </Pressable>

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </View>

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
    backgroundColor: '#f6efe3',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#eadfcd',
    borderRadius: 16,
    padding: 16,
  },
  title: {
    color: '#4a3828',
    fontSize: 24,
    fontWeight: '800',
  },
  caption: {
    marginTop: 4,
    color: '#806a50',
    fontSize: 13,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderColor: '#d8c8af',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  label: {
    color: '#6a543c',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  readonlyBox: {
    borderWidth: 1,
    borderColor: '#dac9b2',
    borderRadius: 10,
    backgroundColor: '#f8f1e7',
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  readonlyText: {
    color: '#745d43',
    fontSize: 14,
  },
  avatarRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eadfcd',
  },
  avatarFallback: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#b59670',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  avatarActions: {
    flex: 1,
    gap: 8,
  },
  photoButton: {
    borderRadius: 10,
    backgroundColor: '#9b7a50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  photoButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  photoGhostButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d7c7ad',
    backgroundColor: '#f8f1e6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  photoGhostButtonText: {
    color: '#6c5439',
    fontWeight: '700',
    fontSize: 13,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dac9b2',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 11,
    paddingVertical: 10,
    color: '#4a3828',
    fontSize: 14,
  },
  textArea: {
    minHeight: 86,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#9b7a50',
    alignItems: 'center',
    paddingVertical: 11,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  message: {
    marginTop: 8,
    color: '#745d43',
    fontSize: 12,
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


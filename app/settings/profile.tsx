import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SettingsPageScaffold, SettingsSection } from '@/app/settings/_shared';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { pickImageFromLibrary } from '@/lib/mobile-image-picker';
import {
  AVATAR_ICON_OPTIONS,
  buildAvatarIconValue,
  getAvatarIconGlyph,
  parseAvatarValue,
} from '@/lib/profile-avatar';

function AvatarPreview({ avatarValue, fallbackLetter }: { avatarValue: string; fallbackLetter: string }) {
  const parsed = parseAvatarValue(avatarValue);

  if (parsed.type === 'image') {
    return <Image source={{ uri: parsed.uri }} style={styles.avatarImage} />;
  }
  if (parsed.type === 'icon') {
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarIconGlyph}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>{fallbackLetter || '?'}</Text>
    </View>
  );
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const fontFamily = typography.fontFamily;
  const scale = typography.scale;

  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [dogName, setDogName] = useState(profile?.dogName ?? '');
  const [dogBreed, setDogBreed] = useState(profile?.dogBreed ?? '');
  const [avatarValue, setAvatarValue] = useState(profile?.avatarUrl ?? '');
  const [isActionModalOpen, setActionModalOpen] = useState(false);
  const [isIconModalOpen, setIconModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setName(profile?.name ?? '');
    setBio(profile?.bio ?? '');
    setDogName(profile?.dogName ?? '');
    setDogBreed(profile?.dogBreed ?? '');
    setAvatarValue(profile?.avatarUrl ?? '');
  }, [profile]);

  const previewLetter = useMemo(() => (name.trim().charAt(0) || profile?.name?.trim().charAt(0) || '?').toUpperCase(), [name, profile?.name]);

  const handleUploadPhoto = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setAvatarValue(picked.dataUrl);
      setMessage('写真を選択しました。保存するとプロフィールに反映されます。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '写真アップロードに失敗しました。');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage('表示名は必須です。');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({
        name: trimmedName,
        email: profile.email,
        avatarUrl: avatarValue.trim(),
        bio: bio.trim(),
        dogName: dogName.trim(),
        dogBreed: dogBreed.trim(),
      });
      setMessage('プロフィールを保存しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'プロフィール保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPageScaffold
      title="プロフィール"
      subtitle="掲示板に表示する内容を編集"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}
    >
      <SettingsSection theme={activeTheme} typography={typography} title="アバター">
        <View style={styles.avatarRow}>
          <Pressable
            style={[styles.avatarTapArea, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setActionModalOpen(true)}>
            <AvatarPreview avatarValue={avatarValue} fallbackLetter={previewLetter} />
          </Pressable>
          <View style={styles.avatarHintWrap}>
            <Text style={[styles.avatarHintTitle, { color: colors.text, fontFamily, fontSize: 14 * scale }]}>
              アイコンをタップして変更
            </Text>
            <Text style={[styles.avatarHintBody, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>
              X のように「アイコン選択」か「写真アップロード」を選べます。
            </Text>
          </View>
        </View>
      </SettingsSection>

      <SettingsSection theme={activeTheme} typography={typography} title="公開プロフィール">
        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>表示名</Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
                fontFamily,
                fontSize: 15 * scale,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="表示名を入力"
            placeholderTextColor={colors.mutedText}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>自己紹介</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
                fontFamily,
                fontSize: 14 * scale,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="あなたと愛犬のことを紹介"
            placeholderTextColor={colors.mutedText}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>Dog Name</Text>
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
              value={dogName}
              onChangeText={setDogName}
              placeholder="Mugi"
              placeholderTextColor={colors.mutedText}
            />
          </View>
          <View style={styles.inlineField}>
            <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>Dog Breed</Text>
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
              value={dogBreed}
              onChangeText={setDogBreed}
              placeholder="Pomeranian"
              placeholderTextColor={colors.mutedText}
            />
          </View>
        </View>
      </SettingsSection>

      <Pressable style={[styles.saveButton, { backgroundColor: colors.accent }]} onPress={() => void handleSave()} disabled={saving}>
        <Text style={[styles.saveButtonText, { color: colors.accentContrast, fontFamily }]}>
          {saving ? '保存中...' : '保存する'}
        </Text>
      </Pressable>
      {message ? <Text style={[styles.messageText, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>{message}</Text> : null}

      <Modal visible={isActionModalOpen} transparent animationType="fade" onRequestClose={() => setActionModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily }]}>プロフィール画像を変更</Text>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setActionModalOpen(false);
                setIconModalOpen(true);
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>アイコンを選択</Text>
            </Pressable>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setActionModalOpen(false);
                void handleUploadPhoto();
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>写真をアップロード</Text>
            </Pressable>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setAvatarValue('');
                setActionModalOpen(false);
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>現在の画像を削除</Text>
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setActionModalOpen(false)}>
              <Text style={[styles.modalCancelText, { color: colors.mutedText, fontFamily }]}>キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isIconModalOpen} transparent animationType="fade" onRequestClose={() => setIconModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.iconModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily }]}>アイコンを選択</Text>
            <ScrollView contentContainerStyle={styles.iconGrid} showsVerticalScrollIndicator={false}>
              {AVATAR_ICON_OPTIONS.map((item) => {
                const selected = avatarValue.trim() === buildAvatarIconValue(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.iconButton,
                      {
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.chip : colors.background,
                      },
                    ]}
                    onPress={() => {
                      setAvatarValue(buildAvatarIconValue(item.id));
                      setIconModalOpen(false);
                    }}>
                    <Text style={styles.iconButtonGlyph}>{item.glyph}</Text>
                    <Text style={[styles.iconButtonLabel, { color: colors.mutedText, fontFamily }]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setIconModalOpen(false)}>
              <Text style={[styles.modalCancelText, { color: colors.mutedText, fontFamily }]}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SettingsPageScaffold>
  );
}

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarTapArea: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d8dce8',
  },
  avatarIconGlyph: {
    fontSize: 38,
  },
  avatarFallbackText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#253048',
  },
  avatarHintWrap: {
    flex: 1,
    gap: 3,
  },
  avatarHintTitle: {
    fontWeight: '800',
  },
  avatarHintBody: {
    fontWeight: '500',
    lineHeight: 18,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontWeight: '700',
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  textArea: {
    minHeight: 104,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineField: {
    flex: 1,
    gap: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,16,22,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  iconModalCard: {
    width: '100%',
    maxHeight: '78%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalAction: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancel: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: '31%',
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconButtonGlyph: {
    fontSize: 30,
  },
  iconButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});


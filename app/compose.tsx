import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { createBoardPost } from '@/lib/board-data';
import { pickImagesFromLibrary } from '@/lib/mobile-image-picker';
import { hasSupabaseEnv } from '@/lib/supabase';

function extractHashtags(...values: string[]) {
  const tags = new Set<string>();
  for (const value of values) {
    for (const match of value.matchAll(/(?:^|\s)#([^\s#]+)/g)) {
      const tag = match[1]?.replace(/[.,!?。、「」『』（）()［\]\[\]]+$/g, '').trim().toLowerCase();
      if (tag) tags.add(tag);
    }
  }
  return Array.from(tags).slice(0, 12);
}

export default function ComposeScreen() {
  const router = useRouter();
  const { activeTheme } = useAppTheme();
  const { profile } = useAuth();
  const colors = activeTheme.colors;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handlePickImage = async () => {
    if (imageUrls.length >= 4) return;
    try {
      const picked = await pickImagesFromLibrary(4 - imageUrls.length);
      if (picked.length) setImageUrls((prev) => [...prev, ...picked.map((item) => item.dataUrl)].slice(0, 4));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '写真を選択できませんでした。');
    }
  };

  const handleSubmit = async () => {
    if (!profile || profile.provider === 'guest') {
      setMessage('投稿するにはログインしてください。');
      return;
    }
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle) {
      setMessage('タイトルを入力してください。');
      return;
    }
    if (!trimmedBody) {
      setMessage('本文を入力してください。');
      return;
    }
    if (!hasSupabaseEnv) {
      setMessage('投稿を保存するにはSupabase設定が必要です。');
      return;
    }

    try {
      setSaving(true);
      await createBoardPost({
        author_external_id: profile.externalId,
        author_name: profile.dogName || profile.name || 'ユーザー',
        author_avatar_url: profile.avatarUrl || null,
        category: '投稿',
        title: trimmedTitle,
        body: trimmedBody,
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
        tags: extractHashtags(trimmedTitle, trimmedBody),
      });
      router.replace('/(tabs)' as never);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '投稿の保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={17} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>新規投稿</Text>
          <Pressable
            style={[styles.postButton, { backgroundColor: colors.accent }, saving ? styles.disabled : null]}
            onPress={() => void handleSubmit()}
            disabled={saving}>
            <Text style={[styles.postButtonText, { color: colors.accentContrast }]}>{saving ? '投稿中' : '投稿'}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            style={[styles.titleInput, { color: colors.text }]}
            value={title}
            onChangeText={setTitle}
            placeholder="タイトル"
            placeholderTextColor={colors.mutedText}
          />
          <TextInput
            style={[styles.bodyInput, { color: colors.text }]}
            value={body}
            onChangeText={setBody}
            placeholder="本文に #散歩 #ドッグラン のように書くとタグになります"
            placeholderTextColor={colors.mutedText}
            multiline
            textAlignVertical="top"
          />

          {imageUrls.length > 0 ? (
            <View style={styles.previewGrid}>
              {imageUrls.map((uri, index) => (
                <View key={`${uri}:${index}`} style={styles.previewWrap}>
                  <Image source={{ uri }} style={styles.previewImage} resizeMode="contain" />
                  <Pressable
                    style={styles.removeImageButton}
                    onPress={() => setImageUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}>
                    <FontAwesome6 name="xmark" size={16} color="#ffffff" />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.toolRow}>
            <Pressable
              style={[styles.photoIconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => void handlePickImage()}
              disabled={imageUrls.length >= 4}
              accessibilityRole="button"
              accessibilityLabel="写真を選択">
              <FontAwesome6 name="image" size={20} color={colors.accent} />
            </Pressable>
          </View>

          {message ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  header: { minHeight: 54, borderBottomWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '900' },
  postButton: { minHeight: 36, borderRadius: 18, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  postButtonText: { fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  content: { padding: 14, gap: 12 },
  titleInput: { minHeight: 48, fontSize: 20, fontWeight: '800', paddingHorizontal: 2 },
  bodyInput: { minHeight: 160, fontSize: 16, lineHeight: 23, paddingHorizontal: 2, paddingTop: 8 },
  previewGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  previewWrap: { position: 'relative', width: '48.5%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#e5e7eb' },
  previewImage: { width: '100%', height: '100%' },
  removeImageButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15,23,42,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  photoIconButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  message: { fontSize: 13, lineHeight: 19 },
});

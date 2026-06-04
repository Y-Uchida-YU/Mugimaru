import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { deleteBoardPost, listBoardPostsByAuthor } from '@/lib/board-data';
import { mapRowToPost, type BoardPostView } from '@/lib/board-view-models';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { listSavedPosts, removeSavedPost } from '@/lib/saved-posts';
import { hasSupabaseEnv } from '@/lib/supabase';

function Avatar({ uri, label }: { uri: string; label: string }) {
  const parsed = parseAvatarValue(uri);
  if (parsed.type === 'image') {
    return <Image source={{ uri: parsed.uri }} style={styles.avatarImage} />;
  }
  if (parsed.type === 'icon') {
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarIcon}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>{label.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

function PostRow({
  post,
  actionLabel,
  onAction,
  onPress,
}: {
  post: BoardPostView;
  actionLabel: string;
  onAction: () => void;
  onPress: () => void;
}) {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  return (
    <Pressable style={[styles.postItem, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={onPress}>
      <View style={styles.postTop}>
        <View style={styles.postText}>
          <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
          <Text style={[styles.postBody, { color: colors.mutedText }]} numberOfLines={3}>
            {post.body}
          </Text>
        </View>
        <Pressable style={[styles.rowAction, { borderColor: colors.border }]} onPress={onAction}>
          <Text style={[styles.rowActionText, { color: colors.text }]}>{actionLabel}</Text>
        </Pressable>
      </View>
      <Text style={[styles.postMeta, { color: colors.mutedText }]}>
        {post.replies}件の返信
      </Text>
    </Pressable>
  );
}

export default function MeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;

  const [myPosts, setMyPosts] = useState<BoardPostView[]>([]);
  const [savedPosts, setSavedPosts] = useState<BoardPostView[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadMe = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setMessage('');
    try {
      const saved = await listSavedPosts(profile.externalId);
      setSavedPosts(saved.map((record) => record.post));
      if (hasSupabaseEnv) {
        const rows = await listBoardPostsByAuthor(profile.externalId, 100);
        setMyPosts(rows.map(mapRowToPost));
      } else {
        setMyPosts([]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const confirmDeletePost = (post: BoardPostView) => {
    Alert.alert('投稿を削除しますか？', 'この操作は元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: () => void handleDeletePost(post),
      },
    ]);
  };

  const handleDeletePost = async (post: BoardPostView) => {
    if (!profile) return;
    try {
      if (hasSupabaseEnv) {
        await deleteBoardPost(post.id, profile.externalId);
      }
      setMyPosts((prev) => prev.filter((item) => item.id !== post.id));
      setMessage('投稿を削除しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '投稿の削除に失敗しました。');
    }
  };

  const handleRemoveSaved = async (postId: string) => {
    if (!profile) return;
    await removeSavedPost(profile.externalId, postId);
    setSavedPosts((prev) => prev.filter((post) => post.id !== postId));
    setMessage('保存を解除しました。');
  };

  if (!profile) return null;

  const displayDog = [profile.dogName, profile.dogBreed].filter(Boolean).join(' / ');
  const label = profile.dogName || profile.name || '自分';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={14} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>マイプロフィール</Text>
          <Pressable style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/dm' as never)}>
            <FontAwesome6 name="envelope" size={13} color={colors.text} />
          </Pressable>
          <Pressable style={[styles.editButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.push('/settings/profile' as never)}>
            <FontAwesome6 name="pen" size={13} color={colors.text} />
          </Pressable>
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.cover, { backgroundColor: colors.chip }]}>
            {profile.headerUrl ? <Image source={{ uri: profile.headerUrl }} style={styles.coverImage} /> : null}
          </View>
          <View style={styles.profileBody}>
            <Avatar uri={profile.avatarUrl} label={label} />
            <Text style={[styles.ownerName, { color: colors.mutedText }]}>{profile.name}</Text>
            {displayDog ? <Text style={[styles.dogName, { color: colors.text }]}>{displayDog}</Text> : null}
            <Text style={[styles.bio, { color: colors.text }]}>{profile.bio || '自己紹介はまだありません。'}</Text>
            {profile.prefecture || profile.city ? (
              <Text style={[styles.subText, { color: colors.mutedText }]}>
                {[profile.prefecture, profile.city].filter(Boolean).join(' ')}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable
            style={[styles.tabButton, activeTab === 'posts' ? { backgroundColor: colors.accent } : null]}
            onPress={() => setActiveTab('posts')}>
            <Text style={[styles.tabText, { color: activeTab === 'posts' ? colors.accentContrast : colors.text }]}>自分の投稿</Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === 'saved' ? { backgroundColor: colors.accent } : null]}
            onPress={() => setActiveTab('saved')}>
            <Text style={[styles.tabText, { color: activeTab === 'saved' ? colors.accentContrast : colors.text }]}>保存した投稿</Text>
          </Pressable>
        </View>

        {activeTab === 'posts' ? (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>自分の投稿</Text>
          {loading ? <Text style={[styles.message, { color: colors.mutedText }]}>読み込み中...</Text> : null}
          {!loading && myPosts.length === 0 ? <Text style={[styles.message, { color: colors.mutedText }]}>投稿はまだありません。</Text> : null}
          {myPosts.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              actionLabel="削除"
              onAction={() => confirmDeletePost(post)}
              onPress={() => router.push(`/post/${encodeURIComponent(post.id)}` as never)}
            />
          ))}
        </View>
        ) : null}

        {activeTab === 'saved' ? (
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>保存した投稿</Text>
          {savedPosts.length === 0 ? <Text style={[styles.message, { color: colors.mutedText }]}>保存した投稿はまだありません。</Text> : null}
          {savedPosts.map((post) => (
            <PostRow
              key={`saved:${post.id}`}
              post={post}
              actionLabel="解除"
              onAction={() => void handleRemoveSaved(post.id)}
              onPress={() => router.push(`/post/${encodeURIComponent(post.id)}` as never)}
            />
          ))}
        </View>
        ) : null}

        {message ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 36, gap: 12 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800' },
  editButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  cover: { height: 132 },
  coverImage: { width: '100%', height: '100%' },
  profileBody: { padding: 14, paddingTop: 0, gap: 9 },
  avatarImage: { width: 82, height: 82, borderRadius: 41, marginTop: -41, borderWidth: 3, borderColor: '#ffffff' },
  avatarFallback: {
    width: 82,
    height: 82,
    borderRadius: 41,
    marginTop: -41,
    borderWidth: 3,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eadfce',
  },
  avatarIcon: { fontSize: 40 },
  avatarInitial: { color: '#6b4f2f', fontSize: 28, fontWeight: '900' },
  ownerName: { fontSize: 13, fontWeight: '800' },
  dogName: { fontSize: 22, fontWeight: '900' },
  bio: { fontSize: 14, lineHeight: 21 },
  subText: { fontSize: 12, fontWeight: '700' },
  tabBar: { minHeight: 42, borderRadius: 12, borderWidth: 1, padding: 3, flexDirection: 'row', gap: 3 },
  tabButton: { flex: 1, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tabText: { fontSize: 13, fontWeight: '900' },
  sectionCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  postItem: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  postTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  postText: { flex: 1, gap: 5 },
  postTitle: { fontSize: 15, fontWeight: '900' },
  postBody: { fontSize: 13, lineHeight: 19 },
  postMeta: { fontSize: 12, fontWeight: '700' },
  rowAction: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  rowActionText: { fontSize: 12, fontWeight: '900' },
  message: { fontSize: 13, lineHeight: 19 },
});

import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { deleteBoardPost, listBoardPostsByAuthor } from '@/lib/board-data';
import { mapRowToPost, type BoardPostView } from '@/lib/board-view-models';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { listSavedPosts, removeSavedPost } from '@/lib/saved-posts';
import { hasSupabaseEnv } from '@/lib/supabase';
import { getFollowCounts } from '@/lib/user-data';

type FollowCounts = {
  followers: number;
  following: number;
};

function Avatar({ uri, label, size = 94, borderColor = '#ffffff' }: { uri: string; label: string; size?: number; borderColor?: string }) {
  const parsed = parseAvatarValue(uri);
  const avatarStyle = { width: size, height: size, borderRadius: size / 2, borderColor };
  if (parsed.type === 'image') {
    return <Image source={{ uri: parsed.uri }} style={[styles.avatarBase, avatarStyle]} />;
  }
  if (parsed.type === 'icon') {
    return (
      <View style={[styles.avatarBase, styles.avatarFallback, avatarStyle]}>
        <Text style={{ fontSize: Math.max(28, Math.floor(size * 0.46)) }}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.avatarBase, styles.avatarFallback, avatarStyle]}>
      <Text style={[styles.avatarInitial, { fontSize: Math.max(28, Math.floor(size * 0.34)) }]}>{label.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

function PostRow({
  post,
  actionLabel,
  onAction,
  onPress,
  busy,
}: {
  post: BoardPostView;
  actionLabel: string;
  onAction: () => void;
  onPress: () => void;
  busy?: boolean;
}) {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const image = post.imageUrls[0] || post.imageUrl;
  return (
    <Pressable style={[styles.postItem, { borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={styles.postAvatar}>
        <FontAwesome6 name="paw" size={15} color={colors.accent} />
      </View>
      <View style={styles.postBodyWrap}>
        <View style={styles.postHeader}>
          <Text style={[styles.postAuthor, { color: colors.text }]} numberOfLines={1}>
            {post.author}
          </Text>
          <Text style={[styles.postHandle, { color: colors.mutedText }]} numberOfLines={1}>
            @{post.authorExternalId} · {post.updatedAt}
          </Text>
          <Pressable style={[styles.inlineAction, busy ? styles.disabled : null]} onPress={onAction} disabled={busy}>
            {busy ? <ActivityIndicator size="small" color={colors.mutedText} /> : <Text style={[styles.inlineActionText, { color: colors.mutedText }]}>{actionLabel}</Text>}
          </Pressable>
        </View>
        <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
        <Text style={[styles.postText, { color: colors.text }]}>{post.body}</Text>
        {image ? <Image source={{ uri: image }} style={[styles.postImage, { borderColor: colors.border }]} /> : null}
        <View style={styles.postStats}>
          <Text style={[styles.postMeta, { color: colors.mutedText }]}>
            <FontAwesome6 name="comment" size={12} color={colors.mutedText} /> {post.replies}
          </Text>
          {post.tags.slice(0, 2).map((tag) => (
            <Text key={tag} style={[styles.postMeta, { color: colors.mutedText }]}>
              #{tag}
            </Text>
          ))}
        </View>
      </View>
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
  const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'media'>('posts');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busyPostId, setBusyPostId] = useState<string | null>(null);

  const loadMe = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setMessage('');
    try {
      const saved = await listSavedPosts(profile.externalId);
      setSavedPosts(saved.map((record) => record.post));
      if (hasSupabaseEnv) {
        const [rows, counts] = await Promise.all([listBoardPostsByAuthor(profile.externalId, 100), getFollowCounts(profile.externalId)]);
        setMyPosts(rows.map(mapRowToPost));
        setFollowCounts(counts);
      } else {
        setMyPosts([]);
        setFollowCounts({ followers: 0, following: 0 });
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
    if (busyPostId || !profile) return;
    try {
      setBusyPostId(post.id);
      if (hasSupabaseEnv) {
        await deleteBoardPost(post.id, profile.externalId);
      }
      setMyPosts((prev) => prev.filter((item) => item.id !== post.id));
      setMessage('投稿を削除しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '投稿の削除に失敗しました。');
    }
    setBusyPostId(null);
  };

  const handleRemoveSaved = async (postId: string) => {
    if (busyPostId || !profile) return;
    setBusyPostId(postId);
    await removeSavedPost(profile.externalId, postId);
    setSavedPosts((prev) => prev.filter((post) => post.id !== postId));
    setMessage('保存を解除しました。');
    setBusyPostId(null);
  };

  if (!profile) return null;

  const displayName = profile.dogName || profile.name || 'ゲスト';
  const handle = profile.externalId;
  const dogInfo = [profile.dogName, profile.dogBreed].filter(Boolean).join(' / ');
  const location = [profile.prefecture, profile.city].filter(Boolean).join(' ');
  const joined = '';
  const currentPosts = activeTab === 'saved' ? savedPosts : activeTab === 'media' ? myPosts.filter((post) => post.imageUrls.length > 0 || post.imageUrl) : myPosts;
  const emptyLabel = activeTab === 'saved' ? '保存した投稿はまだありません。' : activeTab === 'media' ? '画像付き投稿はまだありません。' : '投稿はまだありません。';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.topBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={18} color={colors.text} />
          </Pressable>
          <View style={styles.topTitleWrap}>
            <Text style={[styles.topTitle, { color: colors.text }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.topSubtitle, { color: colors.mutedText }]}>{myPosts.length}件の投稿</Text>
          </View>
          <Pressable style={[styles.headerAction, { backgroundColor: `${colors.text}22` }]} onPress={() => router.push('/settings/profile' as never)}>
            <FontAwesome6 name="pen" size={15} color={colors.text} />
          </Pressable>
          <Pressable style={[styles.headerAction, { backgroundColor: `${colors.text}22` }]} onPress={() => router.push('/dm' as never)}>
            <FontAwesome6 name="envelope" size={15} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={[styles.cover, { backgroundColor: colors.chip }]}>
            {profile.headerUrl ? (
              <Image source={{ uri: profile.headerUrl }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverFallback, { backgroundColor: colors.chip }]}>
                <FontAwesome6 name="dog" size={42} color={colors.chipText} />
              </View>
            )}
          </View>
          <View style={styles.avatarOverlap}>
            <Avatar uri={profile.avatarUrl} label={displayName} borderColor={colors.background} />
          </View>
        </View>

        <View style={[styles.profileInfo, { borderBottomColor: colors.border }]}>
          <View style={styles.profileActionRow}>
            <View style={styles.profileActionSpacer} />
            <Pressable style={[styles.outlineButton, { borderColor: colors.border }]} onPress={() => router.push('/settings/profile' as never)}>
              <Text style={[styles.outlineButtonText, { color: colors.text }]}>プロフィールを編集</Text>
            </Pressable>
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
          <Text style={[styles.handle, { color: colors.mutedText }]}>@{handle}</Text>
          {dogInfo ? <Text style={[styles.dogInfo, { color: colors.text }]}>愛犬: {dogInfo}</Text> : null}
          <Text style={[styles.bio, { color: colors.text }]}>{profile.bio || '自己紹介はまだありません。'}</Text>
          <View style={styles.metaRow}>
            {location ? (
              <Text style={[styles.metaText, { color: colors.mutedText }]}>
                <FontAwesome6 name="location-dot" size={13} color={colors.mutedText} /> {location}
              </Text>
            ) : null}
            {joined ? (
              <Text style={[styles.metaText, { color: colors.mutedText }]}>
                <FontAwesome6 name="calendar" size={13} color={colors.mutedText} /> {joined}
              </Text>
            ) : null}
          </View>
          <View style={styles.followRow}>
            <Pressable onPress={() => router.push(`/follows?user=${encodeURIComponent(profile.externalId)}&type=following` as never)}>
              <Text style={[styles.followText, { color: colors.text }]}>
                {followCounts.following.toLocaleString()} <Text style={{ color: colors.mutedText }}>フォロー中</Text>
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/follows?user=${encodeURIComponent(profile.externalId)}&type=followers` as never)}>
              <Text style={[styles.followText, { color: colors.text }]}>
                {followCounts.followers.toLocaleString()} <Text style={{ color: colors.mutedText }}>フォロワー</Text>
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {[
            ['posts', 'ポスト'],
            ['saved', '保存'],
            ['media', '画像'],
          ].map(([key, label]) => {
            const active = activeTab === key;
            return (
              <Pressable key={key} style={styles.tabButton} onPress={() => setActiveTab(key as typeof activeTab)}>
                <Text style={[styles.tabText, { color: active ? colors.text : colors.mutedText }]}>{label}</Text>
                <View style={[styles.tabIndicator, { backgroundColor: active ? colors.accent : 'transparent' }]} />
              </Pressable>
            );
          })}
        </View>

        {loading ? <Text style={[styles.message, { color: colors.mutedText }]}>読み込み中...</Text> : null}
        {!loading && currentPosts.length === 0 ? <Text style={[styles.message, { color: colors.mutedText }]}>{emptyLabel}</Text> : null}
        {currentPosts.map((post) => (
          <PostRow
            key={`${activeTab}:${post.id}`}
            post={post}
            actionLabel={activeTab === 'saved' ? '解除' : '削除'}
            onAction={() => (activeTab === 'saved' ? void handleRemoveSaved(post.id) : confirmDeletePost(post))}
            onPress={() => router.push(`/post/${encodeURIComponent(post.id)}` as never)}
            busy={busyPostId === post.id}
          />
        ))}

        {message ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  disabled: { opacity: 0.6 },
  content: { paddingBottom: 32 },
  topBar: { minHeight: 52, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topTitleWrap: { flex: 1 },
  topTitle: { fontSize: 17, fontWeight: '900' },
  topSubtitle: { fontSize: 12, fontWeight: '700' },
  headerAction: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  hero: { position: 'relative' },
  cover: { height: 174, overflow: 'hidden' },
  coverImage: { width: '100%', height: '100%' },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatarOverlap: { position: 'absolute', left: 14, bottom: -47 },
  avatarBase: { borderWidth: 4 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadfce' },
  avatarInitial: { color: '#6b4f2f', fontWeight: '900' },
  profileInfo: { paddingHorizontal: 14, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  profileActionRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileActionSpacer: { width: 112 },
  outlineButton: { minHeight: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  outlineButtonText: { fontSize: 13, fontWeight: '900' },
  name: { fontSize: 26, fontWeight: '900', lineHeight: 31 },
  handle: { fontSize: 15, lineHeight: 21 },
  dogInfo: { marginTop: 10, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  bio: { marginTop: 10, fontSize: 15, lineHeight: 22 },
  metaRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaText: { fontSize: 14, lineHeight: 20 },
  followRow: { marginTop: 12, flexDirection: 'row', gap: 18 },
  followText: { fontSize: 14, fontWeight: '900' },
  tabBar: { minHeight: 54, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row' },
  tabButton: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
  tabText: { fontSize: 15, fontWeight: '900' },
  tabIndicator: { width: 52, height: 4, borderRadius: 999 },
  postItem: { borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', gap: 10 },
  postAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadfce' },
  postBodyWrap: { flex: 1, gap: 5 },
  postHeader: { minHeight: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  postAuthor: { maxWidth: 116, fontSize: 15, fontWeight: '900' },
  postHandle: { flex: 1, fontSize: 14 },
  inlineAction: { minWidth: 42, alignItems: 'flex-end', justifyContent: 'center' },
  inlineActionText: { fontSize: 12, fontWeight: '900' },
  postTitle: { fontSize: 15, fontWeight: '900' },
  postText: { fontSize: 15, lineHeight: 22 },
  postImage: { marginTop: 6, width: '100%', height: 190, borderRadius: 16, borderWidth: 1 },
  postStats: { marginTop: 6, flexDirection: 'row', gap: 18 },
  postMeta: { fontSize: 13, fontWeight: '700' },
  message: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, lineHeight: 21 },
});

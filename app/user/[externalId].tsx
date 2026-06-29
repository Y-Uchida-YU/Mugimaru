import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { listBoardPostsByAuthor } from '@/lib/board-data';
import { buildSeedPosts, mapRowToPost, type BoardPostView } from '@/lib/board-view-models';
import { getAppText } from '@/lib/i18n';
import { createNotification } from '@/lib/notifications';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { hasSupabaseEnv } from '@/lib/supabase';
import { followUser, getAppUserByExternalId, getFollowCounts, isFollowingUser, unfollowUser } from '@/lib/user-data';

type ProfileView = {
  externalId: string;
  name: string;
  avatarUrl: string;
  headerUrl: string;
  bio: string;
  dogName: string;
  dogBreed: string;
  prefecture: string;
  city: string;
  createdAt: string;
  followers: number;
  following: number;
  isFollowing: boolean;
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

function formatJoinedLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月からMugimaruを利用しています`;
}

function PostRow({ post, onPress }: { post: BoardPostView; onPress: () => void }) {
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
        </View>
        <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
        <Text style={[styles.postText, { color: colors.text }]}>{post.body}</Text>
        {image ? <Image source={{ uri: image }} style={[styles.postImage, { borderColor: colors.border }]} /> : null}
        <View style={styles.postStats}>
          <View style={styles.inlineMeta}>
            <FontAwesome6 name="comment" size={12} color={colors.mutedText} />
            <Text style={[styles.postMeta, { color: colors.mutedText }]}>{post.replies}</Text>
          </View>
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

export default function UserProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ externalId?: string; name?: string; avatarUrl?: string }>();
  const externalId = typeof params.externalId === 'string' ? decodeURIComponent(params.externalId) : '';
  const fallbackName = typeof params.name === 'string' ? params.name : 'ユーザー';
  const fallbackAvatar = typeof params.avatarUrl === 'string' ? params.avatarUrl : '';
  const text = getAppText();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const { profile } = useAuth();

  const [profileView, setProfileView] = useState<ProfileView>({
    externalId,
    name: fallbackName,
    avatarUrl: fallbackAvatar,
    headerUrl: '',
    bio: '',
    dogName: '',
    dogBreed: '',
    prefecture: '',
    city: '',
    createdAt: '',
    followers: 0,
    following: 0,
    isFollowing: false,
  });
  const [posts, setPosts] = useState<BoardPostView[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'media'>('posts');
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [message, setMessage] = useState('');

  const canFollow = Boolean(profile && profile.provider !== 'guest' && profile.externalId !== externalId);
  const displayTitle = profileView.dogName || profileView.name;
  const dogInfo = [profileView.dogName, profileView.dogBreed].filter(Boolean).join(' / ');
  const location = [profileView.prefecture, profileView.city].filter(Boolean).join(' ');
  const joined = formatJoinedLabel(profileView.createdAt);
  const visiblePosts = activeTab === 'media' ? posts.filter((post) => post.imageUrls.length > 0 || post.imageUrl) : posts;

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setMessage('');

    if (!hasSupabaseEnv) {
      const localPosts = buildSeedPosts(text.board.seedPosts).filter((post) => post.authorExternalId === externalId);
      setPosts(localPosts);
      setProfileView((prev) => ({ ...prev, name: localPosts[0]?.author || prev.name }));
      setLoading(false);
      return;
    }

    try {
      const [user, authoredRows, counts, following] = await Promise.all([
        getAppUserByExternalId(externalId),
        listBoardPostsByAuthor(externalId, 50),
        getFollowCounts(externalId),
        canFollow ? isFollowingUser(profile!.externalId, externalId) : Promise.resolve(false),
      ]);

      setProfileView({
        externalId,
        name: user?.name ?? fallbackName,
        avatarUrl: user?.avatar_url ?? fallbackAvatar,
        headerUrl: user?.header_url ?? '',
        bio: user?.bio ?? '',
        dogName: user?.dog_name ?? '',
        dogBreed: user?.dog_breed ?? '',
        prefecture: user?.prefecture ?? '',
        city: user?.city ?? '',
        createdAt: user?.created_at ?? '',
        followers: counts.followers,
        following: counts.following,
        isFollowing: following,
      });
      setPosts(authoredRows.map(mapRowToPost));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'プロフィールの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [canFollow, externalId, fallbackAvatar, fallbackName, profile, text.board.seedPosts]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleToggleFollow = async () => {
    if (!profile || profile.provider === 'guest' || profile.externalId === externalId) return;
    if (!hasSupabaseEnv) {
      setMessage('フォロー機能はサーバー接続時に利用できます。');
      return;
    }

    try {
      setFollowBusy(true);
      const nextFollowing = !profileView.isFollowing;
      if (nextFollowing) {
        await followUser(profile.externalId, externalId);
        await createNotification({
          recipientExternalId: externalId,
          actorExternalId: profile.externalId,
          actorName: profile.dogName || profile.name,
          actorAvatarUrl: profile.avatarUrl,
          type: 'follow',
          body: 'フォローされました',
        });
      } else {
        await unfollowUser(profile.externalId, externalId);
      }
      setProfileView((prev) => ({
        ...prev,
        isFollowing: nextFollowing,
        followers: Math.max(0, prev.followers + (nextFollowing ? 1 : -1)),
      }));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'フォロー状態の更新に失敗しました。');
    } finally {
      setFollowBusy(false);
    }
  };

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
              {displayTitle}
            </Text>
            <Text style={[styles.topSubtitle, { color: colors.mutedText }]}>{posts.length}件の投稿</Text>
          </View>
          <Pressable
            style={[styles.headerAction, { backgroundColor: `${colors.text}22` }]}
            onPress={() =>
              router.push(
                `/dm/${encodeURIComponent(profileView.externalId)}?name=${encodeURIComponent(displayTitle)}&avatarUrl=${encodeURIComponent(profileView.avatarUrl)}` as never
              )
            }>
            <FontAwesome6 name="envelope" size={15} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={[styles.cover, { backgroundColor: colors.chip }]}>
            {profileView.headerUrl ? (
              <Image source={{ uri: profileView.headerUrl }} style={styles.coverImage} />
            ) : (
              <View style={[styles.coverFallback, { backgroundColor: colors.chip }]}>
                <FontAwesome6 name="dog" size={42} color={colors.chipText} />
              </View>
            )}
          </View>
          <View style={styles.avatarOverlap}>
            <Avatar uri={profileView.avatarUrl} label={displayTitle} borderColor={colors.background} />
          </View>
        </View>

        <View style={[styles.profileInfo, { borderBottomColor: colors.border }]}>
          <View style={styles.profileActionRow}>
            <View style={styles.profileActionSpacer} />
            {canFollow ? (
              <Pressable
                style={[styles.followButton, { backgroundColor: profileView.isFollowing ? colors.background : colors.text, borderColor: colors.border }, followBusy ? styles.disabled : null]}
                onPress={() => void handleToggleFollow()}
                disabled={followBusy}>
                <Text style={[styles.followButtonText, { color: profileView.isFollowing ? colors.text : colors.background }]}>
                  {profileView.isFollowing ? 'フォロー中' : 'フォローする'}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={[styles.name, { color: colors.text }]}>{displayTitle}</Text>
          <Text style={[styles.handle, { color: colors.mutedText }]}>@{profileView.externalId}</Text>
          {dogInfo ? <Text style={[styles.dogInfo, { color: colors.text }]}>愛犬: {dogInfo}</Text> : null}
          {profileView.bio ? <Text style={[styles.bio, { color: colors.text }]}>{profileView.bio}</Text> : null}
          <View style={styles.metaRow}>
            {location ? (
              <View style={styles.profileMetaItem}>
                <FontAwesome6 name="location-dot" size={13} color={colors.mutedText} />
                <Text style={[styles.metaText, { color: colors.mutedText }]}>{location}</Text>
              </View>
            ) : null}
            {joined ? (
              <View style={styles.profileMetaItem}>
                <FontAwesome6 name="calendar" size={13} color={colors.mutedText} />
                <Text style={[styles.metaText, { color: colors.mutedText }]}>{joined}</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.followRow}>
            <Pressable onPress={() => router.push(`/follows?user=${encodeURIComponent(profileView.externalId)}&type=following` as never)}>
              <Text style={[styles.followText, { color: colors.text }]}>
                {profileView.following.toLocaleString()} <Text style={{ color: colors.mutedText }}>フォロー中</Text>
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push(`/follows?user=${encodeURIComponent(profileView.externalId)}&type=followers` as never)}>
              <Text style={[styles.followText, { color: colors.text }]}>
                {profileView.followers.toLocaleString()} <Text style={{ color: colors.mutedText }}>フォロワー</Text>
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          {[
            ['posts', 'ポスト'],
            ['replies', '返信'],
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
        {!loading && visiblePosts.length === 0 ? (
          <Text style={[styles.message, { color: colors.mutedText }]}>{activeTab === 'media' ? '画像付き投稿はまだありません。' : '投稿はまだありません。'}</Text>
        ) : null}
        {visiblePosts.map((post) => (
          <PostRow key={`${activeTab}:${post.id}`} post={post} onPress={() => router.push(`/post/${encodeURIComponent(post.id)}` as never)} />
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
  followButton: { minHeight: 36, borderRadius: 18, borderWidth: 1, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  followButtonText: { fontSize: 13, fontWeight: '900' },
  name: { fontSize: 26, fontWeight: '900', lineHeight: 31 },
  handle: { fontSize: 15, lineHeight: 21 },
  dogInfo: { marginTop: 10, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  bio: { marginTop: 10, fontSize: 15, lineHeight: 22 },
  metaRow: { marginTop: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  profileMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
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
  postTitle: { fontSize: 15, fontWeight: '900' },
  postText: { fontSize: 15, lineHeight: 22 },
  postImage: { marginTop: 6, width: '100%', height: 190, borderRadius: 16, borderWidth: 1 },
  postStats: { marginTop: 6, flexDirection: 'row', gap: 18 },
  inlineMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  postMeta: { fontSize: 13, fontWeight: '700' },
  message: { paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, lineHeight: 21 },
});

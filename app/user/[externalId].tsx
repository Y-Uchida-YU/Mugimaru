import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import { listBoardPostsByAuthor } from '@/lib/board-data';
import { buildSeedPosts, mapRowToPost, type BoardPostView } from '@/lib/board-view-models';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAppText } from '@/lib/i18n';
import { createNotification } from '@/lib/notifications';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { hasSupabaseEnv } from '@/lib/supabase';
import { followUser, getAppUserByExternalId, getFollowCounts, isFollowingUser, unfollowUser } from '@/lib/user-data';

type ProfileView = {
  externalId: string;
  name: string;
  avatarUrl: string;
  bio: string;
  dogName: string;
  dogBreed: string;
  followers: number;
  following: number;
  isFollowing: boolean;
};

function Avatar({ uri, label, size = 72 }: { uri: string; label: string; size?: number }) {
  const parsed = parseAvatarValue(uri);
  if (parsed.type === 'image') {
    return <Image source={{ uri: parsed.uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  if (parsed.type === 'icon') {
    return (
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: Math.max(18, Math.floor(size * 0.58)) }}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarFallbackText}>{label.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
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
    bio: '',
    dogName: '',
    dogBreed: '',
    followers: 0,
    following: 0,
    isFollowing: false,
  });
  const [posts, setPosts] = useState<BoardPostView[]>([]);
  const [loading, setLoading] = useState(true);
  const [followBusy, setFollowBusy] = useState(false);
  const [message, setMessage] = useState('');

  const canFollow = Boolean(profile && profile.provider !== 'guest' && profile.externalId !== externalId);
  const displayTitle = profileView.dogName || profileView.name;
  const dogInfo = [profileView.dogName, profileView.dogBreed].filter(Boolean).join(' / ');

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
        bio: user?.bio ?? '',
        dogName: user?.dog_name ?? '',
        dogBreed: user?.dog_breed ?? '',
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={14} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>プロフィール</Text>
        </View>

        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.profileTop}>
            <Avatar uri={profileView.avatarUrl} label={profileView.name} />
            <View style={styles.profileText}>
              <Text style={[styles.name, { color: colors.text }]}>{displayTitle}</Text>
              <Text style={[styles.subText, { color: colors.mutedText }]}>@{profileView.externalId}</Text>
            </View>
          </View>
          {dogInfo ? <Text style={[styles.subText, { color: colors.mutedText }]}>愛犬: {dogInfo}</Text> : null}
          {profileView.bio ? <Text style={[styles.bio, { color: colors.text }]}>{profileView.bio}</Text> : null}
          <View style={styles.statsRow}>
            <Pressable
              style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => router.push(`/follows?user=${encodeURIComponent(profileView.externalId)}&type=followers` as never)}>
              <Text style={[styles.statValue, { color: colors.text }]}>{profileView.followers}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedText }]}>フォロワー</Text>
            </Pressable>
            <Pressable
              style={[styles.statBox, { backgroundColor: colors.background, borderColor: colors.border }]}
              onPress={() => router.push(`/follows?user=${encodeURIComponent(profileView.externalId)}&type=following` as never)}>
              <Text style={[styles.statValue, { color: colors.text }]}>{profileView.following}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedText }]}>フォロー中</Text>
            </Pressable>
          </View>
          {canFollow ? (
            <View style={styles.actionRow}>
              <Pressable
                style={[styles.followButton, { backgroundColor: colors.accent }, followBusy ? styles.disabled : null]}
                onPress={() => void handleToggleFollow()}
                disabled={followBusy}>
                <Text style={[styles.followText, { color: colors.accentContrast }]}>
                  {profileView.isFollowing ? 'フォロー中' : 'フォローする'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.messageButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() =>
                  router.push(
                    `/dm/${encodeURIComponent(profileView.externalId)}?name=${encodeURIComponent(displayTitle)}&avatarUrl=${encodeURIComponent(profileView.avatarUrl)}` as never
                  )
                }>
                <FontAwesome6 name="envelope" size={13} color={colors.text} />
                <Text style={[styles.messageButtonText, { color: colors.text }]}>DM</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <View style={[styles.postsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>投稿</Text>
          {loading ? <Text style={[styles.message, { color: colors.mutedText }]}>読み込み中...</Text> : null}
          {!loading && posts.length === 0 ? <Text style={[styles.message, { color: colors.mutedText }]}>投稿はまだありません。</Text> : null}
          {posts.map((post) => (
            <Pressable
              key={post.id}
              style={[styles.postItem, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => router.push(`/post/${encodeURIComponent(post.id)}` as never)}>
              <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
              <Text style={[styles.postBody, { color: colors.mutedText }]} numberOfLines={3}>
                {post.body}
              </Text>
              <Text style={[styles.postMeta, { color: colors.mutedText }]}>
                {post.replies}件の返信
              </Text>
            </Pressable>
          ))}
        </View>

        {message ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 34, gap: 12 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  profileCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  profileText: { flex: 1, gap: 3 },
  name: { fontSize: 21, fontWeight: '800' },
  bio: { fontSize: 14, lineHeight: 21 },
  subText: { fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, minHeight: 58, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '700' },
  followButton: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  followText: { fontSize: 14, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 8 },
  messageButton: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  messageButtonText: { fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  postsCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  postItem: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 6 },
  postTitle: { fontSize: 15, fontWeight: '800' },
  postBody: { fontSize: 13, lineHeight: 19 },
  postMeta: { fontSize: 12, fontWeight: '700' },
  message: { fontSize: 13, lineHeight: 19 },
  avatarFallback: { backgroundColor: '#b59670', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
});

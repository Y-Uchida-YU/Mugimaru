import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import {
  addBoardPostLike,
  createBoardComment,
  getBoardPost,
  listBoardComments,
  listBoardPostLikes,
  removeBoardPostLike,
  type BoardCommentRow,
} from '@/lib/board-data';
import {
  buildSeedPosts,
  mapRowToPost,
  type BoardPostView,
} from '@/lib/board-view-models';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAppText } from '@/lib/i18n';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { isPostSaved, removeSavedPost, savePost } from '@/lib/saved-posts';
import { hasSupabaseEnv } from '@/lib/supabase';

type BoardCommentView = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorExternalId: string;
  author: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
};

function mapComment(row: BoardCommentRow): BoardCommentView {
  return {
    id: row.id,
    postId: row.post_id,
    parentCommentId: row.parent_comment_id,
    authorExternalId: row.author_external_id,
    author: row.author_name,
    authorAvatarUrl: row.author_avatar_url ?? '',
    body: row.body,
    createdAt: row.created_at,
  };
}

function Avatar({ uri, label, size = 42 }: { uri: string; label: string; size?: number }) {
  const parsed = parseAvatarValue(uri);
  if (parsed.type === 'image') {
    return <Image source={{ uri: parsed.uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }
  if (parsed.type === 'icon') {
    return (
      <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: Math.max(14, Math.floor(size * 0.58)) }}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarFallbackText}>{label.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

export default function PostDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const postId = typeof params.id === 'string' ? params.id : '';
  const text = getAppText();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const { profile } = useAuth();
  const isGuest = profile?.provider === 'guest';

  const [post, setPost] = useState<BoardPostView | null>(null);
  const [comments, setComments] = useState<BoardCommentView[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const rootComments = useMemo(() => comments.filter((comment) => !comment.parentCommentId), [comments]);

  const loadPost = useCallback(async () => {
    setLoading(true);
    setMessage('');

    if (!hasSupabaseEnv) {
      const localPost = buildSeedPosts(text.board.seedPosts).find((item) => item.id === postId) ?? null;
      setPost(localPost);
      setComments([]);
      setLikesCount(localPost ? Math.max(0, Math.floor(localPost.replies / 2)) : 0);
      setLiked(false);
      setSaved(Boolean(profile?.externalId && localPost ? await isPostSaved(profile.externalId, localPost.id) : false));
      setLoading(false);
      return;
    }

    try {
      const row = await getBoardPost(postId);
      if (!row) {
        setPost(null);
        setMessage('投稿が見つかりません。');
        return;
      }

      const mappedPost = mapRowToPost(row);
      setPost(mappedPost);
      const [commentRows, likeRows] = await Promise.all([
        listBoardComments(postId),
        listBoardPostLikes([postId]),
      ]);
      setComments(commentRows.map(mapComment));
      setLikesCount(likeRows.length);
      setLiked(Boolean(profile?.externalId && likeRows.some((like) => like.user_external_id === profile.externalId)));
      setSaved(Boolean(profile?.externalId && (await isPostSaved(profile.externalId, mappedPost.id))));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '投稿の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [postId, profile?.externalId, text.board.seedPosts]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  const handleToggleLike = async () => {
    if (!post || !profile || isGuest) {
      setMessage('いいねするにはログインが必要です。');
      return;
    }
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    if (!hasSupabaseEnv) return;
    try {
      if (nextLiked) {
        await addBoardPostLike(post.id, profile.externalId);
      } else {
        await removeBoardPostLike(post.id, profile.externalId);
      }
    } catch (error) {
      setLiked(!nextLiked);
      setLikesCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
      setMessage(error instanceof Error ? error.message : 'いいねの更新に失敗しました。');
    }
  };

  const handleToggleSave = async () => {
    if (!post || !profile || isGuest) {
      setMessage('保存するにはログインが必要です。');
      return;
    }
    try {
      if (saved) {
        await removeSavedPost(profile.externalId, post.id);
        setSaved(false);
        setMessage('保存を解除しました。');
      } else {
        await savePost(profile.externalId, post);
        setSaved(true);
        setMessage('投稿を保存しました。');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存状態の更新に失敗しました。');
    }
  };

  const handleSubmitComment = async () => {
    if (!post) return;
    if (!profile || isGuest) {
      setMessage('返信するにはログインが必要です。');
      return;
    }
    const body = commentBody.trim();
    if (!body) {
      setMessage('返信内容を入力してください。');
      return;
    }

    if (!hasSupabaseEnv) {
      setMessage('サンプル表示中は返信を保存できません。');
      return;
    }

    try {
      const created = await createBoardComment({
        post_id: post.id,
        parent_comment_id: null,
        author_external_id: profile.externalId,
        author_name: profile.dogName || profile.name || text.board.anonymous,
        author_avatar_url: profile.avatarUrl || null,
        body,
      });
      setComments((prev) => [...prev, mapComment(created)]);
      setCommentBody('');
      setPost((prev) => (prev ? { ...prev, replies: prev.replies + 1 } : prev));
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '返信の保存に失敗しました。');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.safeArea} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={14} color={colors.text} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.text }]}>投稿</Text>
        </View>

        {loading ? <Text style={[styles.message, { color: colors.mutedText }]}>読み込み中...</Text> : null}
        {!loading && !post ? <Text style={[styles.message, { color: colors.mutedText }]}>{message || '投稿が見つかりません。'}</Text> : null}

        {post ? (
          <>
            <View style={[styles.postCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.authorRow}>
                <Pressable onPress={() => router.push(`/user/${encodeURIComponent(post.authorExternalId)}` as never)}>
                  <Avatar uri={post.authorAvatarUrl} label={post.author} size={46} />
                </Pressable>
                <View style={styles.authorText}>
                  <Pressable onPress={() => router.push(`/user/${encodeURIComponent(post.authorExternalId)}` as never)}>
                    <Text style={[styles.authorName, { color: colors.text }]}>{post.author}</Text>
                  </Pressable>
                  <Text style={[styles.meta, { color: colors.mutedText }]}>
                    {post.category}・{post.updatedAt}
                  </Text>
                </View>
              </View>
              <Text style={[styles.postTitle, { color: colors.text }]}>{post.title}</Text>
              <Text style={[styles.postBody, { color: colors.text }]}>{post.body}</Text>
              {post.imageUrl ? <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" /> : null}

              <View style={styles.statRow}>
                <View style={[styles.statPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{post.replies}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedText }]}>返信</Text>
                </View>
                <Pressable
                  style={[styles.statPill, { backgroundColor: liked ? colors.chip : colors.background, borderColor: colors.border }]}
                  onPress={() => void handleToggleLike()}>
                  <Text style={[styles.statValue, { color: liked ? colors.accent : colors.text }]}>{likesCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedText }]}>いいね</Text>
                </Pressable>
                <Pressable
                  style={[styles.statPill, { backgroundColor: saved ? colors.chip : colors.background, borderColor: colors.border }]}
                  onPress={() => void handleToggleSave()}>
                  <FontAwesome6 name="bookmark" size={18} color={saved ? colors.accent : colors.text} />
                  <Text style={[styles.statLabel, { color: colors.mutedText }]}>{saved ? '保存済み' : '保存'}</Text>
                </Pressable>
              </View>

            </View>

            <View style={[styles.replyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>返信</Text>
              {rootComments.length === 0 ? (
                <Text style={[styles.message, { color: colors.mutedText }]}>まだ返信はありません。</Text>
              ) : (
                rootComments.map((comment) => (
                  <View key={comment.id} style={[styles.commentItem, { borderColor: colors.border }]}>
                    <View style={styles.authorRow}>
                      <Pressable onPress={() => router.push(`/user/${encodeURIComponent(comment.authorExternalId)}` as never)}>
                        <Avatar uri={comment.authorAvatarUrl} label={comment.author} size={32} />
                      </Pressable>
                      <Text style={[styles.commentAuthor, { color: colors.text }]}>{comment.author}</Text>
                    </View>
                    <Text style={[styles.commentBody, { color: colors.mutedText }]}>{comment.body}</Text>
                  </View>
                ))
              )}

              {isGuest ? (
                <Text style={[styles.message, { color: colors.mutedText }]}>返信するにはログインしてください。</Text>
              ) : (
                <View style={styles.commentForm}>
                  <TextInput
                    style={[styles.commentInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={commentBody}
                    onChangeText={setCommentBody}
                    placeholder="返信を入力"
                    placeholderTextColor={colors.mutedText}
                    multiline
                  />
                  <Pressable style={[styles.submitButton, { backgroundColor: colors.accent }]} onPress={() => void handleSubmitComment()}>
                    <Text style={[styles.submitText, { color: colors.accentContrast }]}>返信する</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        ) : null}

        {message && post ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 34, gap: 12 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800' },
  postCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorText: { flex: 1, gap: 2 },
  authorName: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12, fontWeight: '700' },
  postTitle: { fontSize: 20, fontWeight: '800', lineHeight: 27 },
  postBody: { fontSize: 15, lineHeight: 23 },
  postImage: { width: '100%', height: 230, borderRadius: 14 },
  statRow: { flexDirection: 'row', gap: 8 },
  statPill: { flex: 1, minHeight: 58, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 12, fontWeight: '700' },
  stampRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stampPill: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
  stampIcon: { fontSize: 15 },
  stampCount: { fontSize: 12, fontWeight: '800' },
  replyCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  commentItem: { borderTopWidth: 1, paddingTop: 12, gap: 7 },
  commentAuthor: { fontSize: 13, fontWeight: '800' },
  commentBody: { fontSize: 14, lineHeight: 20 },
  commentForm: { gap: 8 },
  commentInput: { minHeight: 82, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, textAlignVertical: 'top' },
  submitButton: { minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 14, fontWeight: '800' },
  message: { fontSize: 13, lineHeight: 19 },
  avatarFallback: { backgroundColor: '#b59670', alignItems: 'center', justifyContent: 'center' },
  avatarFallbackText: { color: '#ffffff', fontSize: 12, fontWeight: '800' },
});

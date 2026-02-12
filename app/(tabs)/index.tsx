import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createBoardComment,
  createBoardPost,
  listBoardComments,
  listBoardPosts,
  listBoardPostsByAuthor,
  updateBoardPostRepliesCount,
  type BoardCommentRow,
  type BoardPostRow,
} from '@/lib/board-data';
import { useAuth } from '@/lib/auth-context';
import { formatMessage, getAppText } from '@/lib/i18n';
import { pickImageFromLibrary } from '@/lib/mobile-image-picker';
import { hasSupabaseEnv } from '@/lib/supabase';
import {
  followUser,
  getAppUserByExternalId,
  getFollowCounts,
  isFollowingUser,
  unfollowUser,
} from '@/lib/user-data';

type BoardPost = {
  id: string;
  authorExternalId: string;
  title: string;
  body: string;
  author: string;
  authorAvatarUrl: string;
  category: string;
  imageUrl: string;
  tags: string[];
  replies: number;
  updatedAt: string;
};

type BoardComment = {
  id: string;
  postId: string;
  parentCommentId: string | null;
  authorExternalId: string;
  author: string;
  authorAvatarUrl: string;
  body: string;
  createdAt: string;
};

type UserProfileModal = {
  externalId: string;
  name: string;
  avatarUrl: string;
  bio: string;
  dogName: string;
  dogBreed: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  posts: BoardPost[];
  loading: boolean;
  message: string;
};

type SeedPost = {
  id: string;
  title: string;
  body: string;
  author: string;
  category: string;
  replies: number;
  updatedAt: string;
};

function formatTimeLabel(iso: string | undefined) {
  if (!iso) return '--';

  const now = Date.now();
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '--';

  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}d ago`;
}

function isImageValue(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/');
}

function buildLocalTimestamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function makeLocalId(prefix: string) {
  return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function parseTags(input: string) {
  const raw = input
    .split(/[\s,]+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^#+/, '').toLowerCase())
    .filter((part) => part.length > 0)
    .slice(0, 12);

  return Array.from(new Set(raw));
}

function buildSeedPosts(seedPosts: SeedPost[]): BoardPost[] {
  return seedPosts.map((post, index) => ({
    id: post.id,
    authorExternalId: `seed:${index}:${post.author}`,
    title: post.title,
    body: post.body,
    author: post.author,
    authorAvatarUrl: '',
    category: post.category,
    imageUrl: '',
    tags: [],
    replies: post.replies,
    updatedAt: post.updatedAt,
  }));
}

function mapRowToPost(row: BoardPostRow): BoardPost {
  return {
    id: row.id,
    authorExternalId: row.author_external_id,
    title: row.title,
    body: row.body,
    author: row.author_name,
    authorAvatarUrl: row.author_avatar_url ?? '',
    category: row.category,
    imageUrl: row.image_url ?? '',
    tags: row.tags ?? [],
    replies: row.replies_count,
    updatedAt: formatTimeLabel(row.updated_at || row.created_at),
  };
}

function mapRowToComment(row: BoardCommentRow): BoardComment {
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

function Avatar({ uri, label, size = 32 }: { uri: string; label: string; size?: number }) {
  if (uri && isImageValue(uri)) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatarImage, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  const letter = label.trim().charAt(0).toUpperCase() || '?';
  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}>
      <Text style={styles.avatarFallbackText}>{letter}</Text>
    </View>
  );
}

export default function BoardScreen() {
  const text = getAppText();
  const { profile } = useAuth();
  const isGuest = profile?.provider === 'guest';
  const categories = text.board.categories;

  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [isComposerOpen, setComposerOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(categories[0] ?? 'General');
  const [imageUrl, setImageUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [formError, setFormError] = useState('');

  const [selectedPost, setSelectedPost] = useState<BoardPost | null>(null);
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [localCommentsByPost, setLocalCommentsByPost] = useState<Record<string, BoardComment[]>>({});
  const [isCommentsLoading, setCommentsLoading] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [commentError, setCommentError] = useState('');
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModal, setProfileModal] = useState<UserProfileModal | null>(null);
  const [isFollowBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!hasSupabaseEnv) {
        if (!active) return;
        setPosts(buildSeedPosts(text.board.seedPosts));
        setMessage('Supabase is not configured. Running in local mode.');
        return;
      }

      try {
        setLoading(true);
        const rows = await listBoardPosts();
        if (!active) return;

        if (rows.length > 0) {
          setPosts(rows.map(mapRowToPost));
        } else {
          setPosts(buildSeedPosts(text.board.seedPosts));
        }

        setMessage('Board synced with Supabase.');
      } catch (error) {
        if (!active) return;
        setPosts(buildSeedPosts(text.board.seedPosts));
        setMessage(error instanceof Error ? error.message : 'Failed to load board posts.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [text]);

  const visiblePosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;

    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.body.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.author.toLowerCase().includes(q) ||
        post.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [posts, query]);

  const rootComments = useMemo(
    () => comments.filter((comment) => !comment.parentCommentId),
    [comments]
  );

  const repliesByParent = useMemo(() => {
    const map: Record<string, BoardComment[]> = {};
    for (const comment of comments) {
      if (!comment.parentCommentId) continue;
      if (!map[comment.parentCommentId]) {
        map[comment.parentCommentId] = [];
      }
      map[comment.parentCommentId].push(comment);
    }
    return map;
  }, [comments]);

  const closeComposer = () => {
    setComposerOpen(false);
    setFormError('');
  };

  const closeCommentModal = () => {
    setSelectedPost(null);
    setComments([]);
    setCommentBody('');
    setReplyToCommentId(null);
    setCommentError('');
  };

  const closeProfileModal = () => {
    setProfileModalOpen(false);
    setProfileModal(null);
    setFollowBusy(false);
  };

  const handlePickPostImage = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setImageUrl(picked.dataUrl);
      setFormError('');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to pick image.');
    }
  };

  const openUserProfile = async (externalId: string, name: string, avatarUrl: string) => {
    const targetId = externalId.trim();
    if (!targetId) return;

    setProfileModalOpen(true);
    setProfileModal({
      externalId: targetId,
      name,
      avatarUrl,
      bio: '',
      dogName: '',
      dogBreed: '',
      followers: 0,
      following: 0,
      isFollowing: false,
      posts: [],
      loading: true,
      message: '',
    });

    if (!hasSupabaseEnv) {
      const localPosts = posts.filter((post) => post.authorExternalId === targetId);
      setProfileModal((prev) => {
        if (!prev || prev.externalId !== targetId) return prev;
        return {
          ...prev,
          posts: localPosts,
          loading: false,
          message: 'Local profile mode.',
        };
      });
      return;
    }

    const canFollow = Boolean(profile && profile.provider !== 'guest' && profile.externalId !== targetId);

    try {
      const [user, authoredRows, counts, following] = await Promise.all([
        getAppUserByExternalId(targetId),
        listBoardPostsByAuthor(targetId, 50),
        getFollowCounts(targetId),
        canFollow ? isFollowingUser(profile!.externalId, targetId) : Promise.resolve(false),
      ]);

      setProfileModal((prev) => {
        if (!prev || prev.externalId !== targetId) return prev;
        return {
          ...prev,
          name: user?.name ?? prev.name,
          avatarUrl: user?.avatar_url ?? prev.avatarUrl,
          bio: user?.bio ?? '',
          dogName: user?.dog_name ?? '',
          dogBreed: user?.dog_breed ?? '',
          followers: counts.followers,
          following: counts.following,
          isFollowing: following,
          posts: authoredRows.map(mapRowToPost),
          loading: false,
          message: '',
        };
      });
    } catch (error) {
      setProfileModal((prev) => {
        if (!prev || prev.externalId !== targetId) return prev;
        return {
          ...prev,
          loading: false,
          message: error instanceof Error ? error.message : 'Failed to load profile.',
        };
      });
    }
  };

  const handleToggleFollow = async () => {
    if (!profile || !profileModal || profile.provider === 'guest') {
      return;
    }

    if (profile.externalId === profileModal.externalId) {
      return;
    }

    if (!hasSupabaseEnv) {
      setProfileModal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          message: 'Follow is available when Supabase is connected.',
        };
      });
      return;
    }

    try {
      setFollowBusy(true);
      const currentlyFollowing = profileModal.isFollowing;
      if (currentlyFollowing) {
        await unfollowUser(profile.externalId, profileModal.externalId);
      } else {
        await followUser(profile.externalId, profileModal.externalId);
      }

      setProfileModal((prev) => {
        if (!prev) return prev;
        const nextFollowing = !prev.isFollowing;
        const delta = nextFollowing ? 1 : -1;
        return {
          ...prev,
          isFollowing: nextFollowing,
          followers: Math.max(0, prev.followers + delta),
          message: '',
        };
      });
    } catch (error) {
      setProfileModal((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          message: error instanceof Error ? error.message : 'Failed to update follow state.',
        };
      });
    } finally {
      setFollowBusy(false);
    }
  };

  const handleCreatePost = async () => {
    if (isGuest) {
      setFormError('Guest users cannot create posts.');
      return;
    }

    if (!title.trim()) {
      setFormError(text.board.titleRequired);
      return;
    }

    if (!body.trim()) {
      setFormError(text.board.bodyRequired);
      return;
    }

    if (imageUrl.trim() && !isImageValue(imageUrl)) {
      setFormError('Image must be selected from photos or be a valid URL.');
      return;
    }

    const authorName = profile?.name?.trim() || text.board.anonymous;
    const authorAvatarUrl = profile?.avatarUrl?.trim() || '';
    const authorExternalId = profile?.externalId ?? makeLocalId('user');
    const tags = parseTags(tagsInput);

    if (!hasSupabaseEnv) {
      const localPost: BoardPost = {
        id: makeLocalId('post'),
        authorExternalId,
        title: title.trim(),
        body: body.trim(),
        author: authorName,
        authorAvatarUrl,
        category: selectedCategory,
        imageUrl: imageUrl.trim(),
        tags,
        replies: 0,
        updatedAt: buildLocalTimestamp(),
      };

      setPosts((prev) => [localPost, ...prev]);
      setTitle('');
      setBody('');
      setImageUrl('');
      setTagsInput('');
      setSelectedCategory(categories[0] ?? 'General');
      setFormError('');
      setComposerOpen(false);
      return;
    }

    try {
      const created = await createBoardPost({
        author_external_id: authorExternalId,
        author_name: authorName,
        author_avatar_url: authorAvatarUrl || null,
        category: selectedCategory,
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl.trim() || null,
        tags,
      });

      setPosts((prev) => [mapRowToPost(created), ...prev]);
      setTitle('');
      setBody('');
      setImageUrl('');
      setTagsInput('');
      setSelectedCategory(categories[0] ?? 'General');
      setFormError('');
      setComposerOpen(false);
      setMessage('Post saved to Supabase.');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save post.');
    }
  };

  const openComments = async (post: BoardPost) => {
    setSelectedPost(post);
    setCommentBody('');
    setReplyToCommentId(null);
    setCommentError('');

    if (!hasSupabaseEnv) {
      setComments(localCommentsByPost[post.id] ?? []);
      return;
    }

    try {
      setCommentsLoading(true);
      const rows = await listBoardComments(post.id);
      setComments(rows.map(mapRowToComment));
    } catch (error) {
      setComments([]);
      setCommentError(error instanceof Error ? error.message : 'Failed to load comments.');
    } finally {
      setCommentsLoading(false);
    }
  };

  const incrementReplies = (postId: string) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, replies: post.replies + 1 } : post)));
  };

  const handleSubmitComment = async () => {
    if (!selectedPost) return;

    if (isGuest) {
      setCommentError('Guest users cannot post comments.');
      return;
    }

    if (!commentBody.trim()) {
      setCommentError('Comment is required.');
      return;
    }

    const parentId = replyToCommentId;
    const authorName = profile?.name?.trim() || text.board.anonymous;
    const authorAvatarUrl = profile?.avatarUrl?.trim() || '';
    const authorExternalId = profile?.externalId ?? makeLocalId('user');
    const currentReplies = posts.find((post) => post.id === selectedPost.id)?.replies ?? 0;
    const nextReplies = currentReplies + 1;

    if (!hasSupabaseEnv) {
      const localComment: BoardComment = {
        id: makeLocalId('comment'),
        postId: selectedPost.id,
        parentCommentId: parentId,
        authorExternalId,
        author: authorName,
        authorAvatarUrl,
        body: commentBody.trim(),
        createdAt: new Date().toISOString(),
      };

      setLocalCommentsByPost((prev) => {
        const next = [...(prev[selectedPost.id] ?? []), localComment];
        return { ...prev, [selectedPost.id]: next };
      });
      setComments((prev) => [...prev, localComment]);
      incrementReplies(selectedPost.id);
      setCommentBody('');
      setReplyToCommentId(null);
      setCommentError('');
      return;
    }

    try {
      const created = await createBoardComment({
        post_id: selectedPost.id,
        parent_comment_id: parentId,
        author_external_id: authorExternalId,
        author_name: authorName,
        author_avatar_url: authorAvatarUrl || null,
        body: commentBody.trim(),
      });

      setComments((prev) => [...prev, mapRowToComment(created)]);
      incrementReplies(selectedPost.id);
      try {
        await updateBoardPostRepliesCount(selectedPost.id, nextReplies);
      } catch {
        // Ignore count sync failure; UI already updated optimistically.
      }
      setCommentBody('');
      setReplyToCommentId(null);
      setCommentError('');
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Failed to save comment.');
    }
  };

  const replyingTo = replyToCommentId
    ? comments.find((comment) => comment.id === replyToCommentId)?.author ?? ''
    : '';

  const canFollowSelectedProfile =
    Boolean(profile) &&
    profile?.provider !== 'guest' &&
    Boolean(profileModal) &&
    profile?.externalId !== profileModal?.externalId;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>{text.board.heroLabel}</Text>
            <Text style={styles.heroTitle}>{text.board.heroTitle}</Text>
            <Text style={styles.heroCaption}>{text.board.heroCaption}</Text>
            {isGuest ? <Text style={styles.heroGuest}>Guest mode: posting is disabled.</Text> : null}
            <Text style={styles.heroSub}>{loading ? 'Loading...' : message}</Text>
          </View>

          <TextInput
            style={styles.searchInput}
            placeholder={text.board.searchPlaceholder}
            placeholderTextColor="#a49178"
            value={query}
            onChangeText={setQuery}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((category) => (
              <View key={category} style={styles.chip}>
                <Text style={styles.chipText}>#{category}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{text.board.latestThreads}</Text>
            <Text style={styles.sectionMeta}>
              {formatMessage(text.board.itemsCount, { count: visiblePosts.length })}
            </Text>
          </View>

          {visiblePosts.map((post) => (
            <View key={post.id} style={styles.postCard}>
              <View style={styles.postTopRow}>
                <View style={styles.postAuthorRow}>
                  <Pressable
                    style={styles.avatarPress}
                    onPress={() => void openUserProfile(post.authorExternalId, post.author, post.authorAvatarUrl)}>
                    <Avatar uri={post.authorAvatarUrl} label={post.author} />
                  </Pressable>
                  <View>
                    <Pressable
                      onPress={() => void openUserProfile(post.authorExternalId, post.author, post.authorAvatarUrl)}>
                      <Text style={styles.authorName}>{post.author}</Text>
                    </Pressable>
                    <Text style={styles.categoryText}>{post.category}</Text>
                  </View>
                </View>
                <Text style={styles.updatedText}>{post.updatedAt}</Text>
              </View>

              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postBody}>{post.body}</Text>

              {post.tags.length > 0 ? (
                <View style={styles.tagWrap}>
                  {post.tags.map((tag) => (
                    <View key={`${post.id}:${tag}`} style={styles.tagChip}>
                      <Text style={styles.tagText}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
              ) : null}

              <View style={styles.postBottomRow}>
                <Text style={styles.replyText}>
                  {formatMessage(text.board.repliesCount, { count: post.replies })}
                </Text>
                <Pressable onPress={() => void openComments(post)}>
                  <Text style={styles.commentAction}>Comments</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.fab, isGuest ? styles.fabDisabled : null]}
          onPress={() => (isGuest ? setMessage('Guest users cannot create posts.') : setComposerOpen(true))}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>

        <Modal visible={isComposerOpen} transparent animationType="fade" onRequestClose={closeComposer}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{text.board.composerTitle}</Text>
              <Text style={styles.metaText}>Author: {profile?.name || text.board.anonymous}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                {categories.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <Pressable
                      key={category}
                      style={[styles.modalChip, isActive ? styles.modalChipActive : null]}
                      onPress={() => setSelectedCategory(category)}>
                      <Text style={[styles.modalChipText, isActive ? styles.modalChipTextActive : null]}>
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <TextInput
                style={styles.modalInput}
                value={title}
                onChangeText={setTitle}
                placeholder={text.board.titlePlaceholder}
                placeholderTextColor="#9f8a70"
              />
              <TextInput
                style={[styles.modalInput, styles.modalTextArea]}
                value={body}
                onChangeText={setBody}
                placeholder={text.board.bodyPlaceholder}
                placeholderTextColor="#9f8a70"
                multiline
                textAlignVertical="top"
              />
              <TextInput
                style={styles.modalInput}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="Tags (e.g. dogrun puppy meetup)"
                placeholderTextColor="#9f8a70"
                autoCapitalize="none"
              />

              <View style={styles.mediaActionRow}>
                <Pressable style={styles.mediaButton} onPress={() => void handlePickPostImage()}>
                  <Text style={styles.mediaButtonText}>Select Photo</Text>
                </Pressable>
                <Pressable style={styles.mediaGhostButton} onPress={() => setImageUrl('')}>
                  <Text style={styles.mediaGhostButtonText}>Remove</Text>
                </Pressable>
              </View>

              {imageUrl.trim() && isImageValue(imageUrl) ? (
                <Image source={{ uri: imageUrl.trim() }} style={styles.previewImage} resizeMode="cover" />
              ) : null}

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={closeComposer}>
                  <Text style={styles.cancelText}>{text.board.cancel}</Text>
                </Pressable>
                <Pressable style={[styles.modalButton, styles.submitButton]} onPress={() => void handleCreatePost()}>
                  <Text style={styles.submitText}>{text.board.post}</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={Boolean(selectedPost)}
          transparent
          animationType="slide"
          onRequestClose={closeCommentModal}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.commentModalCard}>
              <View style={styles.commentModalHeader}>
                <Text style={styles.modalTitle}>Comments</Text>
                <Pressable onPress={closeCommentModal}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              {selectedPost ? (
                <View style={styles.commentPostSummary}>
                  <Text style={styles.commentPostTitle}>{selectedPost.title}</Text>
                  <Text style={styles.commentPostMeta}>{selectedPost.author}</Text>
                </View>
              ) : null}

              <ScrollView style={styles.commentList} contentContainerStyle={styles.commentListContent}>
                {isCommentsLoading ? <Text style={styles.commentHint}>Loading comments...</Text> : null}
                {!isCommentsLoading && rootComments.length === 0 ? (
                  <Text style={styles.commentHint}>No comments yet.</Text>
                ) : null}

                {rootComments.map((comment) => (
                  <View key={comment.id} style={styles.commentItem}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentAuthorRow}>
                        <Pressable
                          onPress={() =>
                            void openUserProfile(comment.authorExternalId, comment.author, comment.authorAvatarUrl)
                          }>
                          <Avatar uri={comment.authorAvatarUrl} label={comment.author} size={24} />
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            void openUserProfile(comment.authorExternalId, comment.author, comment.authorAvatarUrl)
                          }>
                          <Text style={styles.commentAuthorText}>{comment.author}</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => setReplyToCommentId(comment.id)}>
                        <Text style={styles.replyAction}>Reply</Text>
                      </Pressable>
                    </View>
                    <Text style={styles.commentBodyText}>{comment.body}</Text>

                    {(repliesByParent[comment.id] ?? []).map((reply) => (
                      <View key={reply.id} style={styles.replyItem}>
                        <View style={styles.commentHeader}>
                          <View style={styles.commentAuthorRow}>
                            <Pressable
                              onPress={() =>
                                void openUserProfile(reply.authorExternalId, reply.author, reply.authorAvatarUrl)
                              }>
                              <Avatar uri={reply.authorAvatarUrl} label={reply.author} size={20} />
                            </Pressable>
                            <Pressable
                              onPress={() =>
                                void openUserProfile(reply.authorExternalId, reply.author, reply.authorAvatarUrl)
                              }>
                              <Text style={styles.replyAuthorText}>{reply.author}</Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={styles.replyBodyText}>{reply.body}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>

              {isGuest ? (
                <Text style={styles.commentHint}>Guest users cannot post comments.</Text>
              ) : (
                <View style={styles.commentComposer}>
                  {replyToCommentId ? (
                    <View style={styles.replyingBar}>
                      <Text style={styles.replyingText}>Replying to {replyingTo}</Text>
                      <Pressable onPress={() => setReplyToCommentId(null)}>
                        <Text style={styles.replyingCancel}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <TextInput
                    style={styles.commentInput}
                    value={commentBody}
                    onChangeText={setCommentBody}
                    placeholder="Write a comment"
                    multiline
                  />
                  <Pressable style={styles.commentSubmitButton} onPress={() => void handleSubmitComment()}>
                    <Text style={styles.commentSubmitText}>Post</Text>
                  </Pressable>
                </View>
              )}

              {commentError ? <Text style={styles.errorText}>{commentError}</Text> : null}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={isProfileModalOpen}
          transparent
          animationType="slide"
          onRequestClose={closeProfileModal}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.profileModalCard}>
              <View style={styles.commentModalHeader}>
                <Text style={styles.modalTitle}>Profile</Text>
                <Pressable onPress={closeProfileModal}>
                  <Text style={styles.closeText}>Close</Text>
                </Pressable>
              </View>

              {profileModal ? (
                <>
                  <View style={styles.profileTopRow}>
                    <Avatar uri={profileModal.avatarUrl} label={profileModal.name} size={64} />
                    <View style={styles.profileInfoBlock}>
                      <Text style={styles.profileName}>{profileModal.name}</Text>
                      {profileModal.bio ? <Text style={styles.profileBio}>{profileModal.bio}</Text> : null}
                      {profileModal.dogName || profileModal.dogBreed ? (
                        <Text style={styles.profileDogInfo}>
                          Dog: {profileModal.dogName || '-'} / {profileModal.dogBreed || '-'}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.followCountRow}>
                    <View style={styles.followCountItem}>
                      <Text style={styles.followCountValue}>{profileModal.followers}</Text>
                      <Text style={styles.followCountLabel}>Followers</Text>
                    </View>
                    <View style={styles.followCountItem}>
                      <Text style={styles.followCountValue}>{profileModal.following}</Text>
                      <Text style={styles.followCountLabel}>Following</Text>
                    </View>
                  </View>

                  {canFollowSelectedProfile ? (
                    <Pressable
                      style={[styles.followButton, isFollowBusy ? styles.followButtonDisabled : null]}
                      onPress={() => void handleToggleFollow()}
                      disabled={isFollowBusy || profileModal.loading}>
                      <Text style={styles.followButtonText}>
                        {profileModal.isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {profileModal.message ? <Text style={styles.commentHint}>{profileModal.message}</Text> : null}

                  <Text style={styles.profilePostsTitle}>Posts</Text>
                  <ScrollView style={styles.profilePostList} contentContainerStyle={styles.profilePostListContent}>
                    {profileModal.loading ? <Text style={styles.commentHint}>Loading profile...</Text> : null}
                    {!profileModal.loading && profileModal.posts.length === 0 ? (
                      <Text style={styles.commentHint}>No posts yet.</Text>
                    ) : null}

                    {profileModal.posts.map((post) => (
                      <View key={`${profileModal.externalId}:${post.id}`} style={styles.profilePostItem}>
                        <Text style={styles.profilePostTitle}>{post.title}</Text>
                        <Text style={styles.profilePostBody} numberOfLines={3}>
                          {post.body}
                        </Text>
                        {post.tags.length > 0 ? (
                          <Text style={styles.profilePostTags}>#{post.tags.join(' #')}</Text>
                        ) : null}
                      </View>
                    ))}
                  </ScrollView>
                </>
              ) : null}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f6efe3',
  },
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 110,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: '#eadfcd',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  heroLabel: {
    color: '#8b755c',
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#4a3828',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
  },
  heroCaption: {
    color: '#6f5a43',
    fontSize: 14,
  },
  heroGuest: {
    color: '#8a6742',
    fontSize: 12,
    marginTop: 6,
  },
  heroSub: {
    color: '#8a7358',
    fontSize: 12,
    marginTop: 6,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#dbcab2',
    borderRadius: 14,
    borderWidth: 1,
    color: '#4a3828',
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  chips: {
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
    paddingRight: 18,
  },
  chip: {
    backgroundColor: '#f0e6d8',
    borderColor: '#d6c4ab',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: '#6d563d',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#5a4632',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionMeta: {
    color: '#8d765a',
    fontSize: 13,
  },
  postCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#d8c8af',
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  postTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarPress: {
    borderRadius: 18,
  },
  authorName: {
    color: '#5d4934',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryText: {
    color: '#8f7a60',
    fontSize: 12,
  },
  updatedText: {
    color: '#9a8468',
    fontSize: 12,
    paddingTop: 2,
  },
  postTitle: {
    color: '#4a3828',
    fontSize: 16,
    fontWeight: '700',
  },
  postBody: {
    color: '#755e45',
    fontSize: 14,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dccab2',
    backgroundColor: '#f7efe3',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: '#6d563d',
    fontSize: 12,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#dcefe3',
  },
  postBottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  replyText: {
    color: '#745d43',
    fontSize: 13,
    fontWeight: '600',
  },
  commentAction: {
    color: '#9b7a50',
    fontSize: 13,
    fontWeight: '700',
  },
  avatarImage: {
    backgroundColor: '#e7d8c2',
  },
  avatarFallback: {
    backgroundColor: '#b59670',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#b89062',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 30,
    marginTop: -2,
  },
  fabDisabled: {
    backgroundColor: '#c6b293',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 38, 29, 0.45)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#fff9f1',
    borderRadius: 16,
    borderColor: '#dacab2',
    borderWidth: 1,
    padding: 14,
    maxHeight: '86%',
  },
  commentModalCard: {
    backgroundColor: '#fff9f1',
    borderRadius: 16,
    borderColor: '#dacab2',
    borderWidth: 1,
    padding: 14,
    maxHeight: '92%',
  },
  profileModalCard: {
    backgroundColor: '#fff9f1',
    borderRadius: 16,
    borderColor: '#dacab2',
    borderWidth: 1,
    padding: 14,
    maxHeight: '92%',
  },
  modalTitle: {
    color: '#4a3828',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  closeText: {
    color: '#9b7a50',
    fontSize: 14,
    fontWeight: '700',
  },
  metaText: {
    color: '#806a50',
    fontSize: 12,
    marginBottom: 10,
  },
  modalChips: {
    gap: 8,
    marginBottom: 10,
  },
  modalChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d9c8b0',
    backgroundColor: '#f4ebde',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modalChipActive: {
    borderColor: '#b89b76',
    backgroundColor: '#ecdfce',
  },
  modalChipText: {
    color: '#70593f',
    fontSize: 12,
    fontWeight: '600',
  },
  modalChipTextActive: {
    color: '#674f35',
  },
  modalInput: {
    backgroundColor: '#ffffff',
    borderColor: '#dac9b2',
    borderWidth: 1,
    borderRadius: 10,
    color: '#4f3c2a',
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  modalTextArea: {
    minHeight: 120,
  },
  mediaActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  mediaButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#9b7a50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mediaButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  mediaGhostButton: {
    width: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d7c7ad',
    backgroundColor: '#f8f1e6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mediaGhostButtonText: {
    color: '#6c5439',
    fontWeight: '700',
    fontSize: 13,
  },
  previewImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    backgroundColor: '#dcefe3',
    marginBottom: 8,
  },
  errorText: {
    color: '#a53030',
    fontSize: 12,
    marginBottom: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 2,
  },
  modalButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#ede2d2',
  },
  submitButton: {
    backgroundColor: '#9b7a50',
  },
  cancelText: {
    color: '#6c5439',
    fontWeight: '700',
  },
  submitText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  commentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  commentPostSummary: {
    borderWidth: 1,
    borderColor: '#dac9b2',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 10,
  },
  commentPostTitle: {
    color: '#4f3c2a',
    fontSize: 14,
    fontWeight: '700',
  },
  commentPostMeta: {
    color: '#8a7358',
    fontSize: 12,
    marginTop: 2,
  },
  commentList: {
    maxHeight: 280,
    marginBottom: 8,
  },
  commentListContent: {
    gap: 8,
    paddingBottom: 8,
  },
  commentHint: {
    color: '#8d765a',
    fontSize: 12,
  },
  commentItem: {
    borderWidth: 1,
    borderColor: '#dfd0bb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    gap: 6,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  commentAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentAuthorText: {
    color: '#6b543b',
    fontSize: 13,
    fontWeight: '700',
  },
  commentBodyText: {
    color: '#765f47',
    fontSize: 13,
  },
  replyAction: {
    color: '#9b7a50',
    fontSize: 12,
    fontWeight: '700',
  },
  replyItem: {
    marginLeft: 18,
    borderLeftWidth: 2,
    borderLeftColor: '#dccdb8',
    paddingLeft: 8,
    gap: 4,
  },
  replyAuthorText: {
    color: '#6f583f',
    fontSize: 12,
    fontWeight: '700',
  },
  replyBodyText: {
    color: '#806a50',
    fontSize: 12,
  },
  commentComposer: {
    gap: 8,
  },
  replyingBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f4eadc',
    borderWidth: 1,
    borderColor: '#deceb8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  replyingText: {
    color: '#6a5238',
    fontSize: 12,
  },
  replyingCancel: {
    color: '#9b7a50',
    fontSize: 12,
    fontWeight: '700',
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#dac9b2',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 76,
    textAlignVertical: 'top',
  },
  commentSubmitButton: {
    borderRadius: 10,
    backgroundColor: '#9b7a50',
    alignItems: 'center',
    paddingVertical: 10,
  },
  commentSubmitText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  profileTopRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  profileInfoBlock: {
    flex: 1,
    gap: 4,
  },
  profileName: {
    color: '#4a3828',
    fontSize: 18,
    fontWeight: '800',
  },
  profileBio: {
    color: '#765f47',
    fontSize: 13,
  },
  profileDogInfo: {
    color: '#8f785b',
    fontSize: 12,
  },
  followCountRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  followCountItem: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dac9b2',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingVertical: 8,
  },
  followCountValue: {
    color: '#4a3828',
    fontSize: 17,
    fontWeight: '800',
  },
  followCountLabel: {
    color: '#90795c',
    fontSize: 12,
  },
  followButton: {
    borderRadius: 10,
    backgroundColor: '#9b7a50',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  followButtonDisabled: {
    opacity: 0.6,
  },
  followButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  profilePostsTitle: {
    color: '#5d4934',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  profilePostList: {
    maxHeight: 300,
  },
  profilePostListContent: {
    gap: 8,
    paddingBottom: 6,
  },
  profilePostItem: {
    borderWidth: 1,
    borderColor: '#dfd0bb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    gap: 4,
  },
  profilePostTitle: {
    color: '#6b543b',
    fontSize: 14,
    fontWeight: '700',
  },
  profilePostBody: {
    color: '#7e674c',
    fontSize: 13,
  },
  profilePostTags: {
    color: '#6f583f',
    fontSize: 12,
    fontWeight: '600',
  },
});



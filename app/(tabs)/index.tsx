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
  addBoardPostLike,
  addBoardPostStamp,
  createBoardChatMessage,
  createBoardComment,
  createBoardPost,
  listBoardChatMessages,
  listBoardComments,
  listBoardPostLikes,
  listBoardPostStamps,
  listBoardPosts,
  listBoardPostsByAuthor,
  removeBoardPostLike,
  removeBoardPostStamp,
  updateBoardPostRepliesCount,
  type BoardChatMessageRow,
  type BoardCommentRow,
  type BoardPostLikeRow,
  type BoardPostRow,
  type BoardPostStampRow,
} from '@/lib/board-data';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
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

const STAMP_OPTIONS = [
  { key: 'paw', icon: '🐾', label: 'Paw' },
  { key: 'heart', icon: '💛', label: 'Heart' },
  { key: 'wow', icon: '✨', label: 'Wow' },
  { key: 'fire', icon: '🔥', label: 'Fire' },
] as const;

const CHAT_STICKERS = ['🐶', '🦴', '🍋', '💛', '✨'];

type StampKey = (typeof STAMP_OPTIONS)[number]['key'];
type StampBucket = Record<StampKey, number>;

type BoardChatMessage = {
  id: string;
  authorExternalId: string;
  author: string;
  authorAvatarUrl: string;
  body: string;
  sticker: string;
  imageUrl: string;
  createdAt: string;
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

function createEmptyStampBucket(): StampBucket {
  return {
    paw: 0,
    heart: 0,
    wow: 0,
    fire: 0,
  };
}

function isStampKey(value: string): value is StampKey {
  return STAMP_OPTIONS.some((option) => option.key === value);
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

function mapRowToChatMessage(row: BoardChatMessageRow): BoardChatMessage {
  return {
    id: row.id,
    authorExternalId: row.author_external_id,
    author: row.author_name,
    authorAvatarUrl: row.author_avatar_url ?? '',
    body: row.body,
    sticker: row.sticker ?? '',
    imageUrl: row.image_url ?? '',
    createdAt: row.created_at,
  };
}

function buildLocalChatSeed(): BoardChatMessage[] {
  return [
    {
      id: makeLocalId('chat'),
      authorExternalId: 'seed:moderator',
      author: 'Mugimaru Team',
      authorAvatarUrl: '',
      body: 'Welcome to Lemon Lounge. Share moments and tips.',
      sticker: '🍋',
      imageUrl: '',
      createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    },
    {
      id: makeLocalId('chat'),
      authorExternalId: 'seed:walker',
      author: 'Morning Walker',
      authorAvatarUrl: '',
      body: 'Any good sunset routes today?',
      sticker: '',
      imageUrl: '',
      createdAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
    },
  ];
}

function computeEngagement(
  posts: BoardPost[],
  likesRows: BoardPostLikeRow[],
  stampRows: BoardPostStampRow[],
  currentUserExternalId: string | undefined
) {
  const likesCountByPost: Record<string, number> = {};
  const likedByPost: Record<string, boolean> = {};
  const stampCountsByPost: Record<string, StampBucket> = {};
  const myStampsByPost: Record<string, StampKey[]> = {};

  for (const post of posts) {
    likesCountByPost[post.id] = 0;
    stampCountsByPost[post.id] = createEmptyStampBucket();
    myStampsByPost[post.id] = [];
  }

  for (const row of likesRows) {
    likesCountByPost[row.post_id] = (likesCountByPost[row.post_id] ?? 0) + 1;
    if (currentUserExternalId && row.user_external_id === currentUserExternalId) {
      likedByPost[row.post_id] = true;
    }
  }

  for (const row of stampRows) {
    if (!isStampKey(row.stamp)) continue;
    const bucket = stampCountsByPost[row.post_id] ?? createEmptyStampBucket();
    bucket[row.stamp] += 1;
    stampCountsByPost[row.post_id] = bucket;

    if (currentUserExternalId && row.user_external_id === currentUserExternalId) {
      const mine = myStampsByPost[row.post_id] ?? [];
      if (!mine.includes(row.stamp)) {
        myStampsByPost[row.post_id] = [...mine, row.stamp];
      }
    }
  }

  return {
    likesCountByPost,
    likedByPost,
    stampCountsByPost,
    myStampsByPost,
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
  const { activeTheme } = useAppTheme();
  const themeColors = activeTheme.colors;
  const { profile } = useAuth();
  const isGuest = profile?.provider === 'guest';
  const categories = text.board.categories;

  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [likesCountByPost, setLikesCountByPost] = useState<Record<string, number>>({});
  const [likedByPost, setLikedByPost] = useState<Record<string, boolean>>({});
  const [stampCountsByPost, setStampCountsByPost] = useState<Record<string, StampBucket>>({});
  const [myStampsByPost, setMyStampsByPost] = useState<Record<string, StampKey[]>>({});

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
  const [isChatModalOpen, setChatModalOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<BoardChatMessage[]>([]);
  const [localChatMessages, setLocalChatMessages] = useState<BoardChatMessage[]>(buildLocalChatSeed);
  const [chatBody, setChatBody] = useState('');
  const [chatSticker, setChatSticker] = useState<string | null>(null);
  const [chatError, setChatError] = useState('');
  const [isChatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!hasSupabaseEnv) {
        if (!active) return;
        const localPosts = buildSeedPosts(text.board.seedPosts);
        const localLikes: Record<string, number> = {};
        const localStampCounts: Record<string, StampBucket> = {};
        for (const [index, post] of localPosts.entries()) {
          localLikes[post.id] = Math.max(0, Math.floor(post.replies / 2));
          const bucket = createEmptyStampBucket();
          bucket.paw = (index + 1) % 3;
          bucket.heart = (index + 2) % 4;
          bucket.wow = index % 2;
          localStampCounts[post.id] = bucket;
        }

        setPosts(localPosts);
        setLikesCountByPost(localLikes);
        setLikedByPost({});
        setStampCountsByPost(localStampCounts);
        setMyStampsByPost({});
        setMessage('Supabase is not configured. Running in local mode.');
        return;
      }

      try {
        setLoading(true);
        const rows = await listBoardPosts();
        if (!active) return;

        const loadedPosts = rows.map(mapRowToPost);
        setPosts(loadedPosts);

        if (loadedPosts.length > 0) {
          const [likesRows, stampRows] = await Promise.all([
            listBoardPostLikes(loadedPosts.map((post) => post.id)),
            listBoardPostStamps(loadedPosts.map((post) => post.id)),
          ]);

          if (!active) return;

          const engagement = computeEngagement(loadedPosts, likesRows, stampRows, profile?.externalId);
          setLikesCountByPost(engagement.likesCountByPost);
          setLikedByPost(engagement.likedByPost);
          setStampCountsByPost(engagement.stampCountsByPost);
          setMyStampsByPost(engagement.myStampsByPost);
        } else {
          setLikesCountByPost({});
          setLikedByPost({});
          setStampCountsByPost({});
          setMyStampsByPost({});
        }

        setMessage('Board synced with Supabase.');
      } catch (error) {
        if (!active) return;
        setPosts([]);
        setLikesCountByPost({});
        setLikedByPost({});
        setStampCountsByPost({});
        setMyStampsByPost({});
        setMessage(error instanceof Error ? error.message : 'Failed to load board posts.');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [profile?.externalId, text]);

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

  const closeChatModal = () => {
    setChatModalOpen(false);
    setChatBody('');
    setChatSticker(null);
    setChatError('');
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
      setLikesCountByPost((prev) => ({ ...prev, [localPost.id]: 0 }));
      setStampCountsByPost((prev) => ({ ...prev, [localPost.id]: createEmptyStampBucket() }));
      setMyStampsByPost((prev) => ({ ...prev, [localPost.id]: [] }));
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

      const mapped = mapRowToPost(created);
      setPosts((prev) => [mapped, ...prev]);
      setLikesCountByPost((prev) => ({ ...prev, [mapped.id]: 0 }));
      setStampCountsByPost((prev) => ({ ...prev, [mapped.id]: createEmptyStampBucket() }));
      setMyStampsByPost((prev) => ({ ...prev, [mapped.id]: [] }));
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

  const handleToggleLike = async (postId: string) => {
    if (!profile || isGuest) {
      setMessage('Please sign in to like posts.');
      return;
    }

    const currentlyLiked = Boolean(likedByPost[postId]);
    const nextLiked = !currentlyLiked;

    setLikedByPost((prev) => ({
      ...prev,
      [postId]: nextLiked,
    }));
    setLikesCountByPost((prev) => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] ?? 0) + (nextLiked ? 1 : -1)),
    }));

    if (!hasSupabaseEnv) {
      setMessage('Like updated in local mode.');
      return;
    }

    try {
      if (nextLiked) {
        await addBoardPostLike(postId, profile.externalId);
      } else {
        await removeBoardPostLike(postId, profile.externalId);
      }
    } catch (error) {
      setLikedByPost((prev) => ({
        ...prev,
        [postId]: currentlyLiked,
      }));
      setLikesCountByPost((prev) => ({
        ...prev,
        [postId]: Math.max(0, (prev[postId] ?? 0) + (currentlyLiked ? 1 : -1)),
      }));
      setMessage(error instanceof Error ? error.message : 'Failed to update like.');
    }
  };

  const handleToggleStamp = async (postId: string, stamp: StampKey) => {
    if (!profile || isGuest) {
      setMessage('Please sign in to stamp posts.');
      return;
    }

    const currentMine = myStampsByPost[postId] ?? [];
    const alreadyStamped = currentMine.includes(stamp);

    setMyStampsByPost((prev) => {
      const mine = prev[postId] ?? [];
      const nextMine = alreadyStamped ? mine.filter((item) => item !== stamp) : [...mine, stamp];
      return {
        ...prev,
        [postId]: nextMine,
      };
    });

    setStampCountsByPost((prev) => {
      const base = prev[postId] ?? createEmptyStampBucket();
      return {
        ...prev,
        [postId]: {
          ...base,
          [stamp]: Math.max(0, base[stamp] + (alreadyStamped ? -1 : 1)),
        },
      };
    });

    if (!hasSupabaseEnv) {
      setMessage('Stamp updated in local mode.');
      return;
    }

    try {
      if (alreadyStamped) {
        await removeBoardPostStamp(postId, profile.externalId, stamp);
      } else {
        await addBoardPostStamp(postId, profile.externalId, stamp);
      }
    } catch (error) {
      setMyStampsByPost((prev) => {
        const mine = prev[postId] ?? [];
        const revertedMine = alreadyStamped ? [...mine, stamp] : mine.filter((item) => item !== stamp);
        return {
          ...prev,
          [postId]: Array.from(new Set(revertedMine)),
        };
      });
      setStampCountsByPost((prev) => {
        const base = prev[postId] ?? createEmptyStampBucket();
        return {
          ...prev,
          [postId]: {
            ...base,
            [stamp]: Math.max(0, base[stamp] + (alreadyStamped ? 1 : -1)),
          },
        };
      });
      setMessage(error instanceof Error ? error.message : 'Failed to update stamp.');
    }
  };

  const openChatModal = async () => {
    setChatModalOpen(true);
    setChatError('');

    if (!hasSupabaseEnv) {
      setChatMessages(localChatMessages);
      return;
    }

    try {
      setChatLoading(true);
      const rows = await listBoardChatMessages(200);
      setChatMessages(rows.map(mapRowToChatMessage));
    } catch (error) {
      setChatMessages([]);
      setChatError(error instanceof Error ? error.message : 'Failed to load chat.');
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChatMessage = async () => {
    if (!profile || isGuest) {
      setChatError('Please sign in to use chat.');
      return;
    }

    const trimmedBody = chatBody.trim();
    if (!trimmedBody && !chatSticker) {
      setChatError('Message or sticker is required.');
      return;
    }

    const payload: BoardChatMessage = {
      id: makeLocalId('chat'),
      authorExternalId: profile.externalId,
      author: profile.name || text.board.anonymous,
      authorAvatarUrl: profile.avatarUrl || '',
      body: trimmedBody,
      sticker: chatSticker ?? '',
      imageUrl: '',
      createdAt: new Date().toISOString(),
    };

    if (!hasSupabaseEnv) {
      setLocalChatMessages((prev) => [...prev, payload]);
      setChatMessages((prev) => [...prev, payload]);
      setChatBody('');
      setChatSticker(null);
      setChatError('');
      return;
    }

    try {
      const created = await createBoardChatMessage({
        author_external_id: payload.authorExternalId,
        author_name: payload.author,
        author_avatar_url: payload.authorAvatarUrl || null,
        body: payload.body,
        sticker: payload.sticker || null,
        image_url: null,
      });
      setChatMessages((prev) => [...prev, mapRowToChatMessage(created)]);
      setChatBody('');
      setChatSticker(null);
      setChatError('');
    } catch (error) {
      setChatError(error instanceof Error ? error.message : 'Failed to send chat message.');
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content}>
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: themeColors.elevated,
                borderColor: themeColors.border,
              },
            ]}>
            <View style={styles.heroGlowPrimary} />
            <View style={styles.heroGlowSecondary} />
            <Text style={[styles.heroLabel, { color: themeColors.mutedText }]}>{text.board.heroLabel}</Text>
            <Text style={[styles.heroTitle, { color: themeColors.text }]}>{text.board.heroTitle}</Text>
            <Text style={[styles.heroCaption, { color: themeColors.mutedText }]}>{text.board.heroCaption}</Text>
            <View style={styles.heroStatsRow}>
              <View style={[styles.heroStatPill, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
                <Text style={[styles.heroStatLabel, { color: themeColors.mutedText }]}>posts</Text>
                <Text style={[styles.heroStatValue, { color: themeColors.text }]}>{posts.length}</Text>
              </View>
              <View style={[styles.heroStatPill, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
                <Text style={[styles.heroStatLabel, { color: themeColors.mutedText }]}>visible</Text>
                <Text style={[styles.heroStatValue, { color: themeColors.text }]}>{visiblePosts.length}</Text>
              </View>
              <View style={[styles.heroStatPill, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}>
                <Text style={[styles.heroStatLabel, { color: themeColors.mutedText }]}>chat</Text>
                <Text style={[styles.heroStatValue, { color: themeColors.text }]}>
                  {hasSupabaseEnv ? chatMessages.length : localChatMessages.length}
                </Text>
              </View>
            </View>
            <View style={styles.heroActionRow}>
              <Pressable
                style={[
                  styles.heroActionButton,
                  { backgroundColor: themeColors.accent },
                  isGuest ? styles.heroActionButtonDisabled : null,
                ]}
                onPress={() => (isGuest ? setMessage('Guest users cannot create posts.') : setComposerOpen(true))}>
                <Text style={[styles.heroActionText, { color: themeColors.accentContrast }]}>Create Post</Text>
              </Pressable>
              <Pressable
                style={[styles.heroGhostButton, { borderColor: themeColors.border, backgroundColor: themeColors.chip }]}
                onPress={() => void openChatModal()}>
                <Text style={[styles.heroGhostButtonText, { color: themeColors.chipText }]}>Open Chat</Text>
              </Pressable>
            </View>
            {isGuest ? <Text style={[styles.heroGuest, { color: themeColors.mutedText }]}>Guest mode: posting is disabled.</Text> : null}
            <Text style={[styles.heroSub, { color: themeColors.mutedText }]}>{loading ? 'Loading...' : message}</Text>
          </View>

          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: themeColors.surface,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            placeholder={text.board.searchPlaceholder}
            placeholderTextColor={themeColors.mutedText}
            value={query}
            onChangeText={setQuery}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {categories.map((category) => (
              <View key={category} style={[styles.chip, { backgroundColor: themeColors.chip, borderColor: themeColors.border }]}>
                <Text style={[styles.chipText, { color: themeColors.chipText }]}>#{category}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{text.board.latestThreads}</Text>
            <Text style={[styles.sectionMeta, { color: themeColors.mutedText }]}>
              {formatMessage(text.board.itemsCount, { count: visiblePosts.length })}
            </Text>
          </View>

          {visiblePosts.map((post) => (
            <View
              key={post.id}
              style={[
                styles.postCard,
                {
                  backgroundColor: themeColors.surface,
                  borderColor: themeColors.border,
                },
              ]}>
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
                      <Text style={[styles.authorName, { color: themeColors.text }]}>{post.author}</Text>
                    </Pressable>
                    <Text style={[styles.updatedText, { color: themeColors.mutedText }]}>{post.updatedAt}</Text>
                  </View>
                </View>
                <View style={[styles.categoryBadge, { borderColor: themeColors.border, backgroundColor: themeColors.chip }]}>
                  <Text style={[styles.categoryBadgeText, { color: themeColors.chipText }]}>{post.category}</Text>
                </View>
              </View>

              <Text style={[styles.postTitle, { color: themeColors.text }]}>{post.title}</Text>
              <Text style={[styles.postBody, { color: themeColors.mutedText }]}>{post.body}</Text>

              {post.tags.length > 0 ? (
                <View style={styles.tagWrap}>
                  {post.tags.map((tag) => (
                    <View
                      key={`${post.id}:${tag}`}
                      style={[styles.tagChip, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
                      <Text style={[styles.tagText, { color: themeColors.mutedText }]}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {post.imageUrl ? (
                <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
              ) : null}

              <View style={styles.actionRow}>
                <Pressable
                  style={[
                    styles.actionPill,
                    {
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                    },
                    likedByPost[post.id]
                      ? [styles.actionPillActive, { borderColor: themeColors.accent, backgroundColor: themeColors.accent }]
                      : null,
                  ]}
                  onPress={() => void handleToggleLike(post.id)}>
                  <Text
                    style={[
                      styles.actionPillText,
                      { color: likedByPost[post.id] ? themeColors.accentContrast : themeColors.text },
                      likedByPost[post.id] ? styles.actionPillTextActive : null,
                    ]}>
                    💛 Like {likesCountByPost[post.id] ?? 0}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.actionPill, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}
                  onPress={() => void openComments(post)}>
                  <Text style={[styles.actionPillText, { color: themeColors.text }]}>
                    💬 {formatMessage(text.board.repliesCount, { count: post.replies })}
                  </Text>
                </Pressable>
              </View>

              <View style={styles.stampRow}>
                {STAMP_OPTIONS.map((stampOption) => {
                  const bucket = stampCountsByPost[post.id] ?? createEmptyStampBucket();
                  const mine = myStampsByPost[post.id] ?? [];
                  const active = mine.includes(stampOption.key);
                  return (
                    <Pressable
                      key={`${post.id}:stamp:${stampOption.key}`}
                      style={[
                        styles.stampButton,
                        { borderColor: themeColors.border, backgroundColor: themeColors.background },
                        active
                          ? [styles.stampButtonActive, { borderColor: themeColors.accent, backgroundColor: themeColors.chip }]
                          : null,
                      ]}
                      onPress={() => void handleToggleStamp(post.id, stampOption.key)}>
                      <Text style={styles.stampEmoji}>{stampOption.icon}</Text>
                      <Text
                        style={[
                          styles.stampCount,
                          { color: active ? themeColors.text : themeColors.mutedText },
                          active ? styles.stampCountActive : null,
                        ]}>
                        {bucket[stampOption.key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <Pressable
          style={[styles.fab, { backgroundColor: themeColors.accent }, isGuest ? styles.fabDisabled : null]}
          onPress={() => (isGuest ? setMessage('Guest users cannot create posts.') : setComposerOpen(true))}>
          <Text style={[styles.fabText, { color: themeColors.accentContrast }]}>+</Text>
        </Pressable>

        <Modal visible={isComposerOpen} transparent animationType="fade" onRequestClose={closeComposer}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.modalCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>{text.board.composerTitle}</Text>
              <Text style={[styles.metaText, { color: themeColors.mutedText }]}>Author: {profile?.name || text.board.anonymous}</Text>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChips}>
                {categories.map((category) => {
                  const isActive = selectedCategory === category;
                  return (
                    <Pressable
                      key={category}
                      style={[
                        styles.modalChip,
                        { borderColor: themeColors.border, backgroundColor: themeColors.chip },
                        isActive ? [styles.modalChipActive, { borderColor: themeColors.accent, backgroundColor: themeColors.accent }] : null,
                      ]}
                      onPress={() => setSelectedCategory(category)}>
                      <Text
                        style={[
                          styles.modalChipText,
                          { color: isActive ? themeColors.accentContrast : themeColors.chipText },
                          isActive ? styles.modalChipTextActive : null,
                        ]}>
                        {category}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                value={title}
                onChangeText={setTitle}
                placeholder={text.board.titlePlaceholder}
                placeholderTextColor={themeColors.mutedText}
              />
              <TextInput
                style={[
                  styles.modalInput,
                  styles.modalTextArea,
                  {
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                value={body}
                onChangeText={setBody}
                placeholder={text.board.bodyPlaceholder}
                placeholderTextColor={themeColors.mutedText}
                multiline
                textAlignVertical="top"
              />
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="Tags (e.g. dogrun puppy meetup)"
                placeholderTextColor={themeColors.mutedText}
                autoCapitalize="none"
              />

              <View style={styles.mediaActionRow}>
                <Pressable style={[styles.mediaButton, { backgroundColor: themeColors.accent }]} onPress={() => void handlePickPostImage()}>
                  <Text style={[styles.mediaButtonText, { color: themeColors.accentContrast }]}>Select Photo</Text>
                </Pressable>
                <Pressable
                  style={[styles.mediaGhostButton, { borderColor: themeColors.border, backgroundColor: themeColors.chip }]}
                  onPress={() => setImageUrl('')}>
                  <Text style={[styles.mediaGhostButtonText, { color: themeColors.chipText }]}>Remove</Text>
                </Pressable>
              </View>

              {imageUrl.trim() && isImageValue(imageUrl) ? (
                <Image source={{ uri: imageUrl.trim() }} style={styles.previewImage} resizeMode="cover" />
              ) : null}

              {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: themeColors.chip }]}
                  onPress={closeComposer}>
                  <Text style={[styles.cancelText, { color: themeColors.chipText }]}>{text.board.cancel}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: themeColors.accent }]}
                  onPress={() => void handleCreatePost()}>
                  <Text style={[styles.submitText, { color: themeColors.accentContrast }]}>{text.board.post}</Text>
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
            <View style={[styles.commentModalCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={styles.commentModalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>Comments</Text>
                <Pressable onPress={closeCommentModal}>
                  <Text style={[styles.closeText, { color: themeColors.mutedText }]}>Close</Text>
                </Pressable>
              </View>

              {selectedPost ? (
                <View
                  style={[
                    styles.commentPostSummary,
                    {
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                    },
                  ]}>
                  <Text style={[styles.commentPostTitle, { color: themeColors.text }]}>{selectedPost.title}</Text>
                  <Text style={[styles.commentPostMeta, { color: themeColors.mutedText }]}>{selectedPost.author}</Text>
                </View>
              ) : null}

              <ScrollView style={styles.commentList} contentContainerStyle={styles.commentListContent}>
                {isCommentsLoading ? <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>Loading comments...</Text> : null}
                {!isCommentsLoading && rootComments.length === 0 ? (
                  <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>No comments yet.</Text>
                ) : null}

                {rootComments.map((comment) => (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentItem,
                      {
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.background,
                      },
                    ]}>
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
                          <Text style={[styles.commentAuthorText, { color: themeColors.text }]}>{comment.author}</Text>
                        </Pressable>
                      </View>
                      <Pressable onPress={() => setReplyToCommentId(comment.id)}>
                        <Text style={[styles.replyAction, { color: themeColors.accent }]}>Reply</Text>
                      </Pressable>
                    </View>
                    <Text style={[styles.commentBodyText, { color: themeColors.mutedText }]}>{comment.body}</Text>

                    {(repliesByParent[comment.id] ?? []).map((reply) => (
                      <View key={reply.id} style={[styles.replyItem, { borderLeftColor: themeColors.border }]}>
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
                              <Text style={[styles.replyAuthorText, { color: themeColors.text }]}>{reply.author}</Text>
                            </Pressable>
                          </View>
                        </View>
                        <Text style={[styles.replyBodyText, { color: themeColors.mutedText }]}>{reply.body}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </ScrollView>

              {isGuest ? (
                <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>Guest users cannot post comments.</Text>
              ) : (
                <View style={styles.commentComposer}>
                  {replyToCommentId ? (
                    <View style={[styles.replyingBar, { backgroundColor: themeColors.chip, borderColor: themeColors.border }]}>
                      <Text style={[styles.replyingText, { color: themeColors.chipText }]}>Replying to {replyingTo}</Text>
                      <Pressable onPress={() => setReplyToCommentId(null)}>
                        <Text style={[styles.replyingCancel, { color: themeColors.accent }]}>Cancel</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        borderColor: themeColors.border,
                        backgroundColor: themeColors.background,
                        color: themeColors.text,
                      },
                    ]}
                    value={commentBody}
                    onChangeText={setCommentBody}
                    placeholder="Write a comment"
                    placeholderTextColor={themeColors.mutedText}
                    multiline
                  />
                  <Pressable
                    style={[styles.commentSubmitButton, { backgroundColor: themeColors.accent }]}
                    onPress={() => void handleSubmitComment()}>
                    <Text style={[styles.commentSubmitText, { color: themeColors.accentContrast }]}>Post</Text>
                  </Pressable>
                </View>
              )}

              {commentError ? <Text style={styles.errorText}>{commentError}</Text> : null}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={isChatModalOpen}
          transparent
          animationType="slide"
          onRequestClose={closeChatModal}>
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.chatModalCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={styles.commentModalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>Community Chat</Text>
                <Pressable onPress={closeChatModal}>
                  <Text style={[styles.closeText, { color: themeColors.mutedText }]}>Close</Text>
                </Pressable>
              </View>

              <ScrollView style={styles.chatList} contentContainerStyle={styles.chatListContent}>
                {isChatLoading ? <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>Loading chat...</Text> : null}
                {!isChatLoading && chatMessages.length === 0 ? (
                  <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>No messages yet.</Text>
                ) : null}

                {chatMessages.map((chatMessage) => {
                  const mine = profile?.externalId === chatMessage.authorExternalId;
                  return (
                    <View
                      key={chatMessage.id}
                      style={[styles.chatRow, mine ? styles.chatRowMine : styles.chatRowOther]}>
                      {!mine ? <Avatar uri={chatMessage.authorAvatarUrl} label={chatMessage.author} size={22} /> : null}
                      <View
                        style={[
                          styles.chatBubble,
                          mine
                            ? [styles.chatBubbleMine, { borderColor: themeColors.accent, backgroundColor: themeColors.chip }]
                            : [styles.chatBubbleOther, { borderColor: themeColors.border, backgroundColor: themeColors.background }],
                        ]}>
                        <Text style={[styles.chatAuthor, { color: themeColors.text }]}>{chatMessage.author}</Text>
                        {chatMessage.body ? <Text style={[styles.chatBody, { color: themeColors.text }]}>{chatMessage.body}</Text> : null}
                        {chatMessage.sticker ? <Text style={styles.chatSticker}>{chatMessage.sticker}</Text> : null}
                        <Text style={[styles.chatMeta, { color: themeColors.mutedText }]}>{formatTimeLabel(chatMessage.createdAt)}</Text>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.chatStickerRow}>
                {CHAT_STICKERS.map((sticker) => {
                  const active = sticker === chatSticker;
                  return (
                    <Pressable
                      key={`chat:${sticker}`}
                      style={[
                        styles.chatStickerButton,
                        { borderColor: themeColors.border, backgroundColor: themeColors.background },
                        active ? [styles.chatStickerButtonActive, { borderColor: themeColors.accent, backgroundColor: themeColors.chip }] : null,
                      ]}
                      onPress={() => setChatSticker(active ? null : sticker)}>
                      <Text style={styles.chatStickerButtonText}>{sticker}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.chatComposerRow}>
                <TextInput
                  style={[
                    styles.chatInput,
                    {
                      borderColor: themeColors.border,
                      backgroundColor: themeColors.background,
                      color: themeColors.text,
                    },
                  ]}
                  value={chatBody}
                  onChangeText={setChatBody}
                  placeholder="Write a message"
                  placeholderTextColor={themeColors.mutedText}
                />
                <Pressable
                  style={[styles.chatSendButton, { backgroundColor: themeColors.accent }]}
                  onPress={() => void handleSendChatMessage()}>
                  <Text style={[styles.chatSendText, { color: themeColors.accentContrast }]}>Send</Text>
                </Pressable>
              </View>

              {chatError ? <Text style={styles.errorText}>{chatError}</Text> : null}
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
            <View style={[styles.profileModalCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
              <View style={styles.commentModalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.text }]}>Profile</Text>
                <Pressable onPress={closeProfileModal}>
                  <Text style={[styles.closeText, { color: themeColors.mutedText }]}>Close</Text>
                </Pressable>
              </View>

              {profileModal ? (
                <>
                  <View style={styles.profileTopRow}>
                    <Avatar uri={profileModal.avatarUrl} label={profileModal.name} size={64} />
                    <View style={styles.profileInfoBlock}>
                      <Text style={[styles.profileName, { color: themeColors.text }]}>{profileModal.name}</Text>
                      {profileModal.bio ? <Text style={[styles.profileBio, { color: themeColors.mutedText }]}>{profileModal.bio}</Text> : null}
                      {profileModal.dogName || profileModal.dogBreed ? (
                        <Text style={[styles.profileDogInfo, { color: themeColors.mutedText }]}>
                          Dog: {profileModal.dogName || '-'} / {profileModal.dogBreed || '-'}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.followCountRow}>
                    <View style={[styles.followCountItem, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
                      <Text style={[styles.followCountValue, { color: themeColors.text }]}>{profileModal.followers}</Text>
                      <Text style={[styles.followCountLabel, { color: themeColors.mutedText }]}>Followers</Text>
                    </View>
                    <View style={[styles.followCountItem, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
                      <Text style={[styles.followCountValue, { color: themeColors.text }]}>{profileModal.following}</Text>
                      <Text style={[styles.followCountLabel, { color: themeColors.mutedText }]}>Following</Text>
                    </View>
                  </View>

                  {canFollowSelectedProfile ? (
                    <Pressable
                      style={[
                        styles.followButton,
                        { backgroundColor: themeColors.accent },
                        isFollowBusy ? styles.followButtonDisabled : null,
                      ]}
                      onPress={() => void handleToggleFollow()}
                      disabled={isFollowBusy || profileModal.loading}>
                      <Text style={[styles.followButtonText, { color: themeColors.accentContrast }]}>
                        {profileModal.isFollowing ? 'Following' : 'Follow'}
                      </Text>
                    </Pressable>
                  ) : null}

                  {profileModal.message ? <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>{profileModal.message}</Text> : null}

                  <Text style={[styles.profilePostsTitle, { color: themeColors.text }]}>Posts</Text>
                  <ScrollView style={styles.profilePostList} contentContainerStyle={styles.profilePostListContent}>
                    {profileModal.loading ? <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>Loading profile...</Text> : null}
                    {!profileModal.loading && profileModal.posts.length === 0 ? (
                      <Text style={[styles.commentHint, { color: themeColors.mutedText }]}>No posts yet.</Text>
                    ) : null}

                    {profileModal.posts.map((post) => (
                      <View
                        key={`${profileModal.externalId}:${post.id}`}
                        style={[styles.profilePostItem, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
                        <Text style={[styles.profilePostTitle, { color: themeColors.text }]}>{post.title}</Text>
                        <Text style={[styles.profilePostBody, { color: themeColors.mutedText }]} numberOfLines={3}>
                          {post.body}
                        </Text>
                        {post.tags.length > 0 ? (
                          <Text style={[styles.profilePostTags, { color: themeColors.mutedText }]}>#{post.tags.join(' #')}</Text>
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
    backgroundColor: '#fff8e7',
  },
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 12,
  },
  heroCard: {
    backgroundColor: '#ffe681',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#f2cd58',
    padding: 18,
    marginBottom: 14,
    overflow: 'hidden',
    position: 'relative',
    gap: 8,
  },
  heroGlowPrimary: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    right: -45,
    top: -36,
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
  },
  heroGlowSecondary: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    right: 24,
    top: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  heroLabel: {
    color: '#6b4f00',
    fontSize: 12,
    letterSpacing: 1.1,
    marginBottom: 6,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#2f2200',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroCaption: {
    color: '#4d3a08',
    fontSize: 14,
    maxWidth: '88%',
  },
  heroStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  heroStatPill: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f5d97e',
    backgroundColor: 'rgba(255, 251, 230, 0.7)',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  heroStatLabel: {
    color: '#846410',
    fontSize: 11,
    fontWeight: '700',
  },
  heroStatValue: {
    color: '#2f2200',
    fontSize: 16,
    fontWeight: '800',
  },
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  heroActionButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#29251b',
    paddingVertical: 12,
    alignItems: 'center',
  },
  heroActionButtonDisabled: {
    backgroundColor: '#6f6a5f',
  },
  heroActionText: {
    color: '#fff9ea',
    fontSize: 14,
    fontWeight: '700',
  },
  heroGhostButton: {
    width: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7c6114',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  heroGhostButtonText: {
    color: '#513d09',
    fontSize: 13,
    fontWeight: '700',
  },
  heroGuest: {
    color: '#7a5d11',
    fontSize: 12,
    marginTop: 6,
  },
  heroSub: {
    color: '#654d0b',
    fontSize: 12,
    marginTop: 6,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderColor: '#ebd58c',
    borderRadius: 14,
    borderWidth: 1,
    color: '#3c3011',
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
    backgroundColor: '#fff9e7',
    borderColor: '#eddcaa',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: {
    color: '#6d5620',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#35290d',
    fontSize: 20,
    fontWeight: '800',
  },
  sectionMeta: {
    color: '#8d7540',
    fontSize: 13,
  },
  postCard: {
    backgroundColor: '#fffef8',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#f0ddb0',
    padding: 14,
    marginBottom: 12,
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
    color: '#31250d',
    fontWeight: '700',
    fontSize: 13,
  },
  updatedText: {
    color: '#8c7441',
    fontSize: 11,
    marginTop: 1,
  },
  categoryBadge: {
    borderRadius: 999,
    backgroundColor: '#fff0b8',
    borderWidth: 1,
    borderColor: '#f3d16d',
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginLeft: 8,
  },
  categoryBadgeText: {
    color: '#664f11',
    fontSize: 11,
    fontWeight: '700',
  },
  postTitle: {
    color: '#2f2200',
    fontSize: 18,
    fontWeight: '800',
  },
  postBody: {
    color: '#5f4a1b',
    fontSize: 14,
    lineHeight: 20,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#f0dfb5',
    backgroundColor: '#fff9e6',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: '#7b6230',
    fontSize: 12,
    fontWeight: '600',
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#ebe3ca',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#f0ddb1',
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fffdf3',
  },
  actionPillActive: {
    borderColor: '#f2cb57',
    backgroundColor: '#fff2be',
  },
  actionPillText: {
    color: '#5a4518',
    fontSize: 13,
    fontWeight: '700',
  },
  actionPillTextActive: {
    color: '#4a3608',
  },
  stampRow: {
    flexDirection: 'row',
    gap: 7,
  },
  stampButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1e4bf',
    backgroundColor: '#fffdf5',
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stampButtonActive: {
    borderColor: '#ecbd3b',
    backgroundColor: '#fff0b0',
  },
  stampEmoji: {
    fontSize: 16,
  },
  stampCount: {
    color: '#7b6534',
    fontSize: 12,
    fontWeight: '700',
  },
  stampCountActive: {
    color: '#5f480f',
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
    backgroundColor: 'rgba(30, 25, 12, 0.4)',
    justifyContent: 'center',
    padding: 14,
  },
  modalCard: {
    backgroundColor: '#fffef7',
    borderRadius: 18,
    borderColor: '#f1dfb1',
    borderWidth: 1,
    padding: 14,
    maxHeight: '90%',
  },
  commentModalCard: {
    backgroundColor: '#fffef7',
    borderRadius: 18,
    borderColor: '#f1dfb1',
    borderWidth: 1,
    padding: 14,
    maxHeight: '92%',
  },
  chatModalCard: {
    backgroundColor: '#fffef7',
    borderRadius: 18,
    borderColor: '#f1dfb1',
    borderWidth: 1,
    padding: 14,
    maxHeight: '92%',
  },
  profileModalCard: {
    backgroundColor: '#fffef7',
    borderRadius: 18,
    borderColor: '#f1dfb1',
    borderWidth: 1,
    padding: 14,
    maxHeight: '92%',
  },
  modalTitle: {
    color: '#302400',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  closeText: {
    color: '#7e651f',
    fontSize: 13,
    fontWeight: '700',
  },
  metaText: {
    color: '#866c2c',
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
    borderColor: '#f0deb0',
    backgroundColor: '#fff8e7',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  modalChipActive: {
    borderColor: '#e7be49',
    backgroundColor: '#ffe99d',
  },
  modalChipText: {
    color: '#745d21',
    fontSize: 12,
    fontWeight: '700',
  },
  modalChipTextActive: {
    color: '#4d3809',
  },
  modalInput: {
    backgroundColor: '#fffef8',
    borderColor: '#efddaf',
    borderWidth: 1,
    borderRadius: 10,
    color: '#40310f',
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
    backgroundColor: '#29251b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mediaButtonText: {
    color: '#fff8e7',
    fontWeight: '700',
    fontSize: 13,
  },
  mediaGhostButton: {
    width: 92,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ead9ac',
    backgroundColor: '#fff9e9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  mediaGhostButtonText: {
    color: '#72581f',
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
    color: '#b3362f',
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
    backgroundColor: '#efe8d2',
  },
  submitButton: {
    backgroundColor: '#2b251b',
  },
  cancelText: {
    color: '#665225',
    fontWeight: '700',
  },
  submitText: {
    color: '#fff7df',
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
  chatList: {
    maxHeight: 290,
    marginBottom: 8,
  },
  chatListContent: {
    gap: 8,
    paddingBottom: 8,
  },
  chatRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-end',
  },
  chatRowMine: {
    justifyContent: 'flex-end',
  },
  chatRowOther: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '82%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  chatBubbleMine: {
    borderColor: '#f1c857',
    backgroundColor: '#fff0b8',
  },
  chatBubbleOther: {
    borderColor: '#f0dfb1',
    backgroundColor: '#fffef7',
  },
  chatAuthor: {
    color: '#6a5220',
    fontSize: 11,
    fontWeight: '700',
  },
  chatBody: {
    color: '#3e300e',
    fontSize: 13,
    lineHeight: 18,
  },
  chatSticker: {
    fontSize: 24,
    marginTop: 2,
  },
  chatMeta: {
    color: '#9c8450',
    fontSize: 11,
    alignSelf: 'flex-end',
  },
  chatStickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chatStickerButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0dfb3',
    backgroundColor: '#fffdf6',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
  },
  chatStickerButtonActive: {
    borderColor: '#e7be4b',
    backgroundColor: '#ffeaa0',
  },
  chatStickerButtonText: {
    fontSize: 20,
  },
  chatComposerRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#f0dfb2',
    backgroundColor: '#fffef8',
    paddingHorizontal: 11,
    paddingVertical: 9,
    color: '#413210',
  },
  chatSendButton: {
    width: 86,
    borderRadius: 10,
    backgroundColor: '#2b251b',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
  },
  chatSendText: {
    color: '#fff5dc',
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



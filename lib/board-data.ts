import { supabaseDelete, supabaseInsert, supabasePatch, supabaseSelect, supabaseUpsert } from '@/lib/supabase';

export type BoardPostRow = {
  id: string;
  author_external_id: string;
  author_name: string;
  author_avatar_url: string | null;
  category: string;
  title: string;
  body: string;
  image_url: string | null;
  tags: string[] | null;
  replies_count: number;
  created_at: string;
  updated_at: string;
};

export async function listBoardPosts(limit = 100) {
  return supabaseSelect<BoardPostRow[]>(
    `board_posts?select=id,author_external_id,author_name,author_avatar_url,category,title,body,image_url,tags,replies_count,created_at,updated_at&order=created_at.desc&limit=${limit}`
  );
}

type CreateBoardPostInput = {
  author_external_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  category: string;
  title: string;
  body: string;
  image_url?: string | null;
  tags?: string[] | null;
};

export async function createBoardPost(input: CreateBoardPostInput) {
  const rows = await supabaseInsert<BoardPostRow[]>('board_posts', input);
  return rows[0];
}

export async function listBoardPostsByAuthor(authorExternalId: string, limit = 100) {
  const encoded = encodeURIComponent(authorExternalId);
  return supabaseSelect<BoardPostRow[]>(
    `board_posts?select=id,author_external_id,author_name,author_avatar_url,category,title,body,image_url,tags,replies_count,created_at,updated_at&author_external_id=eq.${encoded}&order=created_at.desc&limit=${limit}`
  );
}

export async function updateBoardPostRepliesCount(postId: string, repliesCount: number) {
  const rows = await supabasePatch<BoardPostRow[]>(
    `board_posts?id=eq.${postId}`,
    { replies_count: Math.max(0, repliesCount) }
  );
  return rows[0];
}

export type BoardCommentRow = {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  author_external_id: string;
  author_name: string;
  author_avatar_url: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

type CreateBoardCommentInput = {
  post_id: string;
  parent_comment_id?: string | null;
  author_external_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  body: string;
};

export async function listBoardComments(postId: string, limit = 200) {
  return supabaseSelect<BoardCommentRow[]>(
    `board_comments?select=id,post_id,parent_comment_id,author_external_id,author_name,author_avatar_url,body,created_at,updated_at&post_id=eq.${postId}&order=created_at.asc&limit=${limit}`
  );
}

export async function createBoardComment(input: CreateBoardCommentInput) {
  const rows = await supabaseInsert<BoardCommentRow[]>('board_comments', input);
  return rows[0];
}

export type BoardPostLikeRow = {
  post_id: string;
  user_external_id: string;
  created_at: string;
};

export type BoardPostStampRow = {
  id: string;
  post_id: string;
  user_external_id: string;
  stamp: string;
  created_at: string;
};

export type BoardChatMessageRow = {
  id: string;
  author_external_id: string;
  author_name: string;
  author_avatar_url: string | null;
  body: string;
  sticker: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};

function buildUuidInFilter(values: string[]) {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  if (unique.length === 0) return null;
  return `(${unique.join(',')})`;
}

export async function listBoardPostLikes(postIds: string[]) {
  const postFilter = buildUuidInFilter(postIds);
  if (!postFilter) return [];

  return supabaseSelect<BoardPostLikeRow[]>(
    `board_post_likes?select=post_id,user_external_id,created_at&post_id=in.${postFilter}&limit=5000`
  );
}

export async function addBoardPostLike(postId: string, userExternalId: string) {
  const rows = await supabaseUpsert<BoardPostLikeRow[]>(
    'board_post_likes',
    {
      post_id: postId,
      user_external_id: userExternalId,
    },
    'post_id,user_external_id'
  );
  return rows[0] ?? null;
}

export async function removeBoardPostLike(postId: string, userExternalId: string) {
  const encodedUser = encodeURIComponent(userExternalId);
  await supabaseDelete<BoardPostLikeRow[]>(
    `board_post_likes?post_id=eq.${postId}&user_external_id=eq.${encodedUser}`
  );
}

export async function listBoardPostStamps(postIds: string[]) {
  const postFilter = buildUuidInFilter(postIds);
  if (!postFilter) return [];

  return supabaseSelect<BoardPostStampRow[]>(
    `board_post_stamps?select=id,post_id,user_external_id,stamp,created_at&post_id=in.${postFilter}&limit=10000`
  );
}

export async function addBoardPostStamp(postId: string, userExternalId: string, stamp: string) {
  const rows = await supabaseUpsert<BoardPostStampRow[]>(
    'board_post_stamps',
    {
      post_id: postId,
      user_external_id: userExternalId,
      stamp,
    },
    'post_id,user_external_id,stamp'
  );
  return rows[0] ?? null;
}

export async function removeBoardPostStamp(postId: string, userExternalId: string, stamp: string) {
  const encodedUser = encodeURIComponent(userExternalId);
  const encodedStamp = encodeURIComponent(stamp);
  await supabaseDelete<BoardPostStampRow[]>(
    `board_post_stamps?post_id=eq.${postId}&user_external_id=eq.${encodedUser}&stamp=eq.${encodedStamp}`
  );
}

export async function listBoardChatMessages(limit = 150) {
  return supabaseSelect<BoardChatMessageRow[]>(
    `board_chat_messages?select=id,author_external_id,author_name,author_avatar_url,body,sticker,image_url,created_at,updated_at&order=created_at.asc&limit=${limit}`
  );
}

type CreateBoardChatMessageInput = {
  author_external_id: string;
  author_name: string;
  author_avatar_url?: string | null;
  body: string;
  sticker?: string | null;
  image_url?: string | null;
};

export async function createBoardChatMessage(input: CreateBoardChatMessageInput) {
  const rows = await supabaseInsert<BoardChatMessageRow[]>('board_chat_messages', input);
  return rows[0];
}

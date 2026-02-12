import { supabaseInsert, supabasePatch, supabaseSelect } from '@/lib/supabase';

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

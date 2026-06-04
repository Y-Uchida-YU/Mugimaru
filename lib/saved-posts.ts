import AsyncStorage from '@react-native-async-storage/async-storage';

import { type BoardPostRow } from '@/lib/board-data';
import { mapRowToPost, type BoardPostView } from '@/lib/board-view-models';
import { hasSupabaseEnv, supabaseDelete, supabaseSelect, supabaseUpsert } from '@/lib/supabase';

const SAVED_POSTS_KEY = 'mugimaru.saved-posts';

type SavedPostRecord = {
  post: BoardPostView;
  savedAt: string;
};

type SavedPostRow = {
  post_id: string;
  saved_at: string;
  board_posts: BoardPostRow | null;
};

type SavedPostMap = Record<string, SavedPostRecord[]>;

async function readSavedMap(): Promise<SavedPostMap> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_POSTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SavedPostMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeSavedMap(value: SavedPostMap) {
  await AsyncStorage.setItem(SAVED_POSTS_KEY, JSON.stringify(value));
}

export async function listSavedPosts(userExternalId: string) {
  if (hasSupabaseEnv) {
    const encoded = encodeURIComponent(userExternalId);
    const rows = await supabaseSelect<SavedPostRow[]>(
      `saved_posts?select=post_id,saved_at,board_posts(id,author_external_id,author_name,author_avatar_url,category,title,body,image_url,image_urls,tags,replies_count,created_at,updated_at)&user_external_id=eq.${encoded}&order=saved_at.desc&limit=200`
    );
    return rows
      .filter((row) => row.board_posts)
      .map((row) => ({
        post: mapRowToPost(row.board_posts as BoardPostRow),
        savedAt: row.saved_at,
      }));
  }

  const savedMap = await readSavedMap();
  return (savedMap[userExternalId] ?? []).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function isPostSaved(userExternalId: string, postId: string) {
  if (hasSupabaseEnv) {
    const encodedUser = encodeURIComponent(userExternalId);
    const encodedPost = encodeURIComponent(postId);
    const rows = await supabaseSelect<Array<{ post_id: string }>>(
      `saved_posts?select=post_id&user_external_id=eq.${encodedUser}&post_id=eq.${encodedPost}&limit=1`
    );
    return rows.length > 0;
  }

  const records = await listSavedPosts(userExternalId);
  return records.some((record) => record.post.id === postId);
}

export async function savePost(userExternalId: string, post: BoardPostView) {
  if (hasSupabaseEnv) {
    await supabaseUpsert(
      'saved_posts',
      {
        user_external_id: userExternalId,
        post_id: post.id,
        saved_at: new Date().toISOString(),
      },
      'user_external_id,post_id'
    );
    return;
  }

  const savedMap = await readSavedMap();
  const records = savedMap[userExternalId] ?? [];
  const nextRecord: SavedPostRecord = { post, savedAt: new Date().toISOString() };
  savedMap[userExternalId] = [nextRecord, ...records.filter((record) => record.post.id !== post.id)];
  await writeSavedMap(savedMap);
}

export async function removeSavedPost(userExternalId: string, postId: string) {
  if (hasSupabaseEnv) {
    const encodedUser = encodeURIComponent(userExternalId);
    const encodedPost = encodeURIComponent(postId);
    await supabaseDelete(`saved_posts?user_external_id=eq.${encodedUser}&post_id=eq.${encodedPost}`);
    return;
  }

  const savedMap = await readSavedMap();
  savedMap[userExternalId] = (savedMap[userExternalId] ?? []).filter((record) => record.post.id !== postId);
  await writeSavedMap(savedMap);
}

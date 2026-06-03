import AsyncStorage from '@react-native-async-storage/async-storage';

import { type BoardPostView } from '@/lib/board-view-models';

const SAVED_POSTS_KEY = 'mugimaru.saved-posts';

type SavedPostRecord = {
  post: BoardPostView;
  savedAt: string;
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
  const savedMap = await readSavedMap();
  return (savedMap[userExternalId] ?? []).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function isPostSaved(userExternalId: string, postId: string) {
  const records = await listSavedPosts(userExternalId);
  return records.some((record) => record.post.id === postId);
}

export async function savePost(userExternalId: string, post: BoardPostView) {
  const savedMap = await readSavedMap();
  const records = savedMap[userExternalId] ?? [];
  const nextRecord: SavedPostRecord = { post, savedAt: new Date().toISOString() };
  savedMap[userExternalId] = [nextRecord, ...records.filter((record) => record.post.id !== post.id)];
  await writeSavedMap(savedMap);
}

export async function removeSavedPost(userExternalId: string, postId: string) {
  const savedMap = await readSavedMap();
  savedMap[userExternalId] = (savedMap[userExternalId] ?? []).filter((record) => record.post.id !== postId);
  await writeSavedMap(savedMap);
}

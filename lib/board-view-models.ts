import { type BoardPostRow } from '@/lib/board-data';

export type BoardPostView = {
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

export type SeedPostView = {
  id: string;
  title: string;
  body: string;
  author: string;
  category: string;
  replies: number;
  updatedAt: string;
};

export type StampKey = 'paw' | 'heart' | 'wow' | 'fire';
export type StampBucket = Record<StampKey, number>;

export const STAMP_OPTIONS: readonly { key: StampKey; icon: string; label: string }[] = [
  { key: 'paw', icon: '🐾', label: 'いいね' },
  { key: 'heart', icon: '💛', label: '共感' },
  { key: 'wow', icon: '😮', label: 'すごい' },
  { key: 'fire', icon: '🔥', label: '注目' },
];

export function formatTimeLabel(iso: string | undefined) {
  if (!iso) return '--';

  const now = Date.now();
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '--';

  const diffMin = Math.floor((now - ts) / 60000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;

  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}日前`;
}

export function createEmptyStampBucket(): StampBucket {
  return {
    paw: 0,
    heart: 0,
    wow: 0,
    fire: 0,
  };
}

export function isStampKey(value: string): value is StampKey {
  return STAMP_OPTIONS.some((option) => option.key === value);
}

export function buildSeedPosts(seedPosts: SeedPostView[]): BoardPostView[] {
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

export function mapRowToPost(row: BoardPostRow): BoardPostView {
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

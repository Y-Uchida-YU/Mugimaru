import { supabaseDelete, supabaseInsert, supabaseSelect, supabaseUpsert } from '@/lib/supabase';
import type { AuthProvider } from '@/lib/auth-context';

type PersistedAuthProvider = Exclude<AuthProvider, 'guest'>;

export type AppUserRow = {
  id: string;
  external_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  dog_name: string | null;
  dog_breed: string | null;
  provider: PersistedAuthProvider;
  created_at: string;
  updated_at: string;
  last_login_at: string;
};

type UpsertUserInput = {
  externalId: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  bio: string | null;
  dogName: string | null;
  dogBreed: string | null;
  provider: PersistedAuthProvider;
};

type UserFollowRow = {
  follower_external_id: string;
  followee_external_id: string;
  created_at: string;
};

export async function upsertAppUser(input: UpsertUserInput) {
  const now = new Date().toISOString();
  const rows = await supabaseUpsert<AppUserRow[]>(
    'app_users',
    {
      external_id: input.externalId,
      name: input.name,
      email: input.email,
      avatar_url: input.avatarUrl,
      bio: input.bio,
      dog_name: input.dogName,
      dog_breed: input.dogBreed,
      provider: input.provider,
      updated_at: now,
      last_login_at: now,
    },
    'external_id'
  );

  return rows[0];
}

export async function getAppUserByExternalId(externalId: string) {
  const encoded = encodeURIComponent(externalId);
  const rows = await supabaseSelect<AppUserRow[]>(
    `app_users?select=id,external_id,name,email,avatar_url,bio,dog_name,dog_breed,provider,created_at,updated_at,last_login_at&external_id=eq.${encoded}&limit=1`
  );
  return rows[0] ?? null;
}

export async function followUser(followerExternalId: string, followeeExternalId: string) {
  const rows = await supabaseInsert<UserFollowRow[]>('user_follows', {
    follower_external_id: followerExternalId,
    followee_external_id: followeeExternalId,
  });
  return rows[0] ?? null;
}

export async function unfollowUser(followerExternalId: string, followeeExternalId: string) {
  const follower = encodeURIComponent(followerExternalId);
  const followee = encodeURIComponent(followeeExternalId);
  await supabaseDelete<UserFollowRow[]>(
    `user_follows?follower_external_id=eq.${follower}&followee_external_id=eq.${followee}`
  );
}

export async function isFollowingUser(followerExternalId: string, followeeExternalId: string) {
  const follower = encodeURIComponent(followerExternalId);
  const followee = encodeURIComponent(followeeExternalId);
  const rows = await supabaseSelect<UserFollowRow[]>(
    `user_follows?select=follower_external_id,followee_external_id,created_at&follower_external_id=eq.${follower}&followee_external_id=eq.${followee}&limit=1`
  );
  return rows.length > 0;
}

export async function getFollowCounts(externalId: string) {
  const encoded = encodeURIComponent(externalId);
  const [followers, following] = await Promise.all([
    supabaseSelect<UserFollowRow[]>(
      `user_follows?select=follower_external_id&followee_external_id=eq.${encoded}`
    ),
    supabaseSelect<UserFollowRow[]>(
      `user_follows?select=followee_external_id&follower_external_id=eq.${encoded}`
    ),
  ]);

  return {
    followers: followers.length,
    following: following.length,
  };
}

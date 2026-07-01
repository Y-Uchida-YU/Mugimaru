import { supabaseDelete, supabaseInsert, supabaseSelect, supabaseUpsert } from '@/lib/supabase';
import type { AuthProvider } from '@/lib/auth-context';

type PersistedAuthProvider = Exclude<AuthProvider, 'guest'>;

export type AppUserRow = {
  id: string;
  external_id: string;
  name: string;
  email: string | null;
  avatar_url: string | null;
  header_url: string | null;
  bio: string | null;
  dog_name: string | null;
  dog_breed: string | null;
  prefecture: string | null;
  city: string | null;
  location_public: boolean | null;
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
  headerUrl?: string | null;
  bio: string | null;
  dogName: string | null;
  dogBreed: string | null;
  prefecture?: string | null;
  city?: string | null;
  locationPublic?: boolean;
  provider: PersistedAuthProvider;
};

type UserFollowRow = {
  follower_external_id: string;
  followee_external_id: string;
  created_at: string;
};

export async function upsertAppUser(input: UpsertUserInput) {
  const now = new Date().toISOString();
  const payload = {
      external_id: input.externalId,
      name: input.name,
      email: input.email,
      avatar_url: input.avatarUrl,
      header_url: input.headerUrl ?? null,
      bio: input.bio,
      dog_name: input.dogName,
      dog_breed: input.dogBreed,
      prefecture: input.prefecture ?? null,
      city: input.city ?? null,
      location_public: input.locationPublic ?? true,
      provider: input.provider,
      updated_at: now,
      last_login_at: now,
  };

  try {
    const rows = await supabaseUpsert<AppUserRow[]>('app_users', payload, 'external_id');
    return rows[0];
  } catch (error) {
    if (!isMissingLocationPublicColumn(error)) throw error;

    const { location_public: _locationPublic, ...legacyPayload } = payload;
    const rows = await supabaseUpsert<AppUserRow[]>('app_users', legacyPayload, 'external_id');
    return { ...rows[0], location_public: true };
  }
}

function isMissingLocationPublicColumn(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.message.includes('location_public') || error.message.includes('PGRST204');
}

export async function getAppUserByExternalId(externalId: string) {
  const encoded = encodeURIComponent(externalId);
  try {
    const rows = await supabaseSelect<AppUserRow[]>(
      `app_users?select=id,external_id,name,email,avatar_url,header_url,bio,dog_name,dog_breed,prefecture,city,location_public,provider,created_at,updated_at,last_login_at&external_id=eq.${encoded}&limit=1`
    );
    return rows[0] ?? null;
  } catch (error) {
    if (!isMissingLocationPublicColumn(error)) throw error;

    const rows = await supabaseSelect<Omit<AppUserRow, 'location_public'>[]>(
      `app_users?select=id,external_id,name,email,avatar_url,header_url,bio,dog_name,dog_breed,prefecture,city,provider,created_at,updated_at,last_login_at&external_id=eq.${encoded}&limit=1`
    );
    const row = rows[0];
    return row ? { ...row, location_public: true } : null;
  }
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

export async function listFollowerUsers(externalId: string) {
  const encoded = encodeURIComponent(externalId);
  const rows = await supabaseSelect<UserFollowRow[]>(
    `user_follows?select=follower_external_id,followee_external_id,created_at&followee_external_id=eq.${encoded}&order=created_at.desc&limit=200`
  );
  const users = await Promise.all(rows.map((row) => getAppUserByExternalId(row.follower_external_id)));
  return users.filter((user): user is AppUserRow => Boolean(user));
}

export async function listFollowingUsers(externalId: string) {
  const encoded = encodeURIComponent(externalId);
  const rows = await supabaseSelect<UserFollowRow[]>(
    `user_follows?select=follower_external_id,followee_external_id,created_at&follower_external_id=eq.${encoded}&order=created_at.desc&limit=200`
  );
  const users = await Promise.all(rows.map((row) => getAppUserByExternalId(row.followee_external_id)));
  return users.filter((user): user is AppUserRow => Boolean(user));
}

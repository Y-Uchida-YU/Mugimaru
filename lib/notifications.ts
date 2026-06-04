import { hasSupabaseEnv, supabaseInsert, supabasePatch, supabaseSelect } from '@/lib/supabase';

export type NotificationType = 'like' | 'follow' | 'dm';

export type NotificationRow = {
  id: string;
  recipient_external_id: string;
  actor_external_id: string;
  actor_name: string;
  actor_avatar_url: string | null;
  type: NotificationType;
  post_id: string | null;
  thread_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};

export async function createNotification(input: {
  recipientExternalId: string;
  actorExternalId: string;
  actorName: string;
  actorAvatarUrl?: string | null;
  type: NotificationType;
  postId?: string | null;
  threadId?: string | null;
  body: string;
}) {
  if (!hasSupabaseEnv || input.recipientExternalId === input.actorExternalId) return null;
  const rows = await supabaseInsert<NotificationRow[]>('notifications', {
    recipient_external_id: input.recipientExternalId,
    actor_external_id: input.actorExternalId,
    actor_name: input.actorName,
    actor_avatar_url: input.actorAvatarUrl ?? null,
    type: input.type,
    post_id: input.postId ?? null,
    thread_id: input.threadId ?? null,
    body: input.body,
  });
  return rows[0] ?? null;
}

export async function listNotifications(recipientExternalId: string, limit = 100) {
  const encoded = encodeURIComponent(recipientExternalId);
  return supabaseSelect<NotificationRow[]>(
    `notifications?select=id,recipient_external_id,actor_external_id,actor_name,actor_avatar_url,type,post_id,thread_id,body,read_at,created_at&recipient_external_id=eq.${encoded}&order=created_at.desc&limit=${limit}`
  );
}

export async function markNotificationsRead(recipientExternalId: string) {
  const encoded = encodeURIComponent(recipientExternalId);
  await supabasePatch<NotificationRow[]>(
    `notifications?recipient_external_id=eq.${encoded}&read_at=is.null`,
    { read_at: new Date().toISOString() }
  );
}

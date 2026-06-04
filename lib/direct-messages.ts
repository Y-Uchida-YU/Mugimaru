import AsyncStorage from '@react-native-async-storage/async-storage';

import { hasSupabaseEnv, supabaseInsert, supabaseSelect } from '@/lib/supabase';

const DM_STORAGE_KEY = 'mugimaru.direct-messages';

export type DirectMessage = {
  id: string;
  threadId: string;
  senderExternalId: string;
  receiverExternalId: string;
  body: string;
  createdAt: string;
};

export type DirectThreadSummary = {
  threadId: string;
  peerExternalId: string;
  peerName: string;
  peerAvatarUrl: string;
  lastMessage: string;
  updatedAt: string;
  messagesCount: number;
};

type DirectMessageStore = {
  messages: DirectMessage[];
  peers: Record<string, { name: string; avatarUrl: string }>;
};

type DirectMessageRow = {
  id: string;
  thread_id: string;
  sender_external_id: string;
  receiver_external_id: string;
  sender_name: string;
  sender_avatar_url: string;
  receiver_name: string;
  receiver_avatar_url: string;
  body: string;
  created_at: string;
};

function threadIdFor(userA: string, userB: string) {
  return [userA, userB].sort().join('__');
}

function mapRowToMessage(row: DirectMessageRow): DirectMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    senderExternalId: row.sender_external_id,
    receiverExternalId: row.receiver_external_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

async function readStore(): Promise<DirectMessageStore> {
  try {
    const raw = await AsyncStorage.getItem(DM_STORAGE_KEY);
    if (!raw) return { messages: [], peers: {} };
    const parsed = JSON.parse(raw) as DirectMessageStore;
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      peers: parsed.peers && typeof parsed.peers === 'object' ? parsed.peers : {},
    };
  } catch {
    return { messages: [], peers: {} };
  }
}

async function writeStore(store: DirectMessageStore) {
  await AsyncStorage.setItem(DM_STORAGE_KEY, JSON.stringify(store));
}

export async function listDirectThreads(myExternalId: string) {
  if (hasSupabaseEnv) {
    const encoded = encodeURIComponent(myExternalId);
    const rows = await supabaseSelect<DirectMessageRow[]>(
      `direct_messages?select=id,thread_id,sender_external_id,receiver_external_id,sender_name,sender_avatar_url,receiver_name,receiver_avatar_url,body,created_at&or=(sender_external_id.eq.${encoded},receiver_external_id.eq.${encoded})&order=created_at.desc&limit=500`
    );
    const summaries = new Map<string, DirectThreadSummary>();
    for (const row of rows) {
      const peerExternalId =
        row.sender_external_id === myExternalId ? row.receiver_external_id : row.sender_external_id;
      const peerName = row.sender_external_id === myExternalId ? row.receiver_name : row.sender_name;
      const peerAvatarUrl =
        row.sender_external_id === myExternalId ? row.receiver_avatar_url : row.sender_avatar_url;
      const current = summaries.get(row.thread_id);
      if (!current) {
        summaries.set(row.thread_id, {
          threadId: row.thread_id,
          peerExternalId,
          peerName: peerName || peerExternalId,
          peerAvatarUrl: peerAvatarUrl || '',
          lastMessage: row.body,
          updatedAt: row.created_at,
          messagesCount: 1,
        });
      } else {
        current.messagesCount += 1;
      }
    }
    return Array.from(summaries.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  const store = await readStore();
  const summaries = new Map<string, DirectThreadSummary>();
  for (const message of store.messages) {
    if (message.senderExternalId !== myExternalId && message.receiverExternalId !== myExternalId) continue;
    const peerExternalId =
      message.senderExternalId === myExternalId ? message.receiverExternalId : message.senderExternalId;
    const peer = store.peers[peerExternalId] ?? { name: peerExternalId, avatarUrl: '' };
    const current = summaries.get(message.threadId);
    if (!current || message.createdAt > current.updatedAt) {
      summaries.set(message.threadId, {
        threadId: message.threadId,
        peerExternalId,
        peerName: peer.name,
        peerAvatarUrl: peer.avatarUrl,
        lastMessage: message.body,
        updatedAt: message.createdAt,
        messagesCount: current?.messagesCount ?? 0,
      });
    }
    const latest = summaries.get(message.threadId);
    if (latest) latest.messagesCount += 1;
  }
  return Array.from(summaries.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listDirectMessages(myExternalId: string, peerExternalId: string) {
  if (hasSupabaseEnv) {
    const threadId = encodeURIComponent(threadIdFor(myExternalId, peerExternalId));
    const rows = await supabaseSelect<DirectMessageRow[]>(
      `direct_messages?select=id,thread_id,sender_external_id,receiver_external_id,sender_name,sender_avatar_url,receiver_name,receiver_avatar_url,body,created_at&thread_id=eq.${threadId}&order=created_at.asc&limit=500`
    );
    return rows.map(mapRowToMessage);
  }

  const store = await readStore();
  const threadId = threadIdFor(myExternalId, peerExternalId);
  return store.messages
    .filter((message) => message.threadId === threadId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function sendDirectMessage(input: {
  senderExternalId: string;
  receiverExternalId: string;
  receiverName: string;
  receiverAvatarUrl: string;
  senderName: string;
  senderAvatarUrl: string;
  body: string;
}) {
  if (hasSupabaseEnv) {
    const rows = await supabaseInsert<DirectMessageRow[]>('direct_messages', {
      thread_id: threadIdFor(input.senderExternalId, input.receiverExternalId),
      sender_external_id: input.senderExternalId,
      receiver_external_id: input.receiverExternalId,
      sender_name: input.senderName || input.senderExternalId,
      sender_avatar_url: input.senderAvatarUrl,
      receiver_name: input.receiverName || input.receiverExternalId,
      receiver_avatar_url: input.receiverAvatarUrl,
      body: input.body,
    });
    return mapRowToMessage(rows[0]);
  }

  const store = await readStore();
  const createdAt = new Date().toISOString();
  const message: DirectMessage = {
    id: `dm:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    threadId: threadIdFor(input.senderExternalId, input.receiverExternalId),
    senderExternalId: input.senderExternalId,
    receiverExternalId: input.receiverExternalId,
    body: input.body,
    createdAt,
  };
  store.peers[input.receiverExternalId] = {
    name: input.receiverName || input.receiverExternalId,
    avatarUrl: input.receiverAvatarUrl,
  };
  store.peers[input.senderExternalId] = {
    name: input.senderName || input.senderExternalId,
    avatarUrl: input.senderAvatarUrl,
  };
  store.messages.push(message);
  await writeStore(store);
  return message;
}

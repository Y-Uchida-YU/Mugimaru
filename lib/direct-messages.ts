import AsyncStorage from '@react-native-async-storage/async-storage';

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

function threadIdFor(userA: string, userB: string) {
  return [userA, userB].sort().join('__');
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

import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { listDirectThreads, type DirectThreadSummary } from '@/lib/direct-messages';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';

function PeerAvatar({ uri, label }: { uri: string; label: string }) {
  const parsed = parseAvatarValue(uri);
  if (parsed.type === 'image') return <Image source={{ uri: parsed.uri }} style={styles.avatar} />;
  if (parsed.type === 'icon') {
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarIcon}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitial}>{label.trim().charAt(0).toUpperCase() || '?'}</Text>
    </View>
  );
}

export default function DirectMessagesScreen() {
  const router = useRouter();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const { profile } = useAuth();
  const [threads, setThreads] = useState<DirectThreadSummary[]>([]);

  const loadThreads = useCallback(async () => {
    if (!profile) return;
    setThreads(await listDirectThreads(profile.externalId));
  }, [profile]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  if (!profile) return null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {threads.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>メッセージはまだありません</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedText }]}>プロフィール画面から相手にDMを送れます。</Text>
          </View>
        ) : null}
        {threads.map((thread) => (
          <Pressable
            key={thread.threadId}
            style={[styles.thread, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() =>
              router.push(
                `/dm/${encodeURIComponent(thread.peerExternalId)}?name=${encodeURIComponent(thread.peerName)}&avatarUrl=${encodeURIComponent(thread.peerAvatarUrl)}` as never
              )
            }>
            <PeerAvatar uri={thread.peerAvatarUrl} label={thread.peerName} />
            <View style={styles.threadBody}>
              <Text style={[styles.threadName, { color: colors.text }]}>{thread.peerName}</Text>
              <Text style={[styles.threadMessage, { color: colors.mutedText }]} numberOfLines={1}>
                {thread.lastMessage}
              </Text>
            </View>
            {thread.unreadCount > 0 ? (
              <View style={[styles.unreadBadge, { backgroundColor: colors.accent }]}>
                <Text style={[styles.unreadText, { color: colors.accentContrast }]}>{thread.unreadCount}</Text>
              </View>
            ) : null}
            <FontAwesome6 name="chevron-right" size={13} color={colors.mutedText} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 10, paddingBottom: 34, gap: 8 },
  empty: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyBody: { fontSize: 13, lineHeight: 19 },
  thread: { minHeight: 72, borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  threadBody: { flex: 1, gap: 3 },
  threadName: { fontSize: 15, fontWeight: '900' },
  threadMessage: { fontSize: 13 },
  unreadBadge: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { fontSize: 12, fontWeight: '900' },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadfce' },
  avatarIcon: { fontSize: 24 },
  avatarInitial: { color: '#6b4f2f', fontSize: 17, fontWeight: '900' },
});

import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
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
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={14} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>DM</Text>
        </View>
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
            <FontAwesome6 name="chevron-right" size={13} color={colors.mutedText} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 16, paddingBottom: 34, gap: 10 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900' },
  empty: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyBody: { fontSize: 13, lineHeight: 19 },
  thread: { minHeight: 72, borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  threadBody: { flex: 1, gap: 3 },
  threadName: { fontSize: 15, fontWeight: '900' },
  threadMessage: { fontSize: 13 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadfce' },
  avatarIcon: { fontSize: 24 },
  avatarInitial: { color: '#6b4f2f', fontSize: 17, fontWeight: '900' },
});

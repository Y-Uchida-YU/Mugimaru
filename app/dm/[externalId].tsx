import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { listDirectMessages, sendDirectMessage, type DirectMessage } from '@/lib/direct-messages';

export default function DirectMessageThreadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ externalId?: string; name?: string; avatarUrl?: string }>();
  const peerExternalId = typeof params.externalId === 'string' ? decodeURIComponent(params.externalId) : '';
  const peerName = typeof params.name === 'string' ? decodeURIComponent(params.name) : 'ユーザー';
  const peerAvatarUrl = typeof params.avatarUrl === 'string' ? decodeURIComponent(params.avatarUrl) : '';
  const { profile } = useAuth();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [body, setBody] = useState('');
  const [notice, setNotice] = useState('');

  const loadMessages = useCallback(async () => {
    if (!profile || !peerExternalId) return;
    setMessages(await listDirectMessages(profile.externalId, peerExternalId));
  }, [peerExternalId, profile]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  const handleSend = async () => {
    if (!profile) return;
    const trimmed = body.trim();
    if (!trimmed) {
      setNotice('メッセージを入力してください。');
      return;
    }
    const sent = await sendDirectMessage({
      senderExternalId: profile.externalId,
      receiverExternalId: peerExternalId,
      receiverName: peerName,
      receiverAvatarUrl: peerAvatarUrl,
      senderName: profile.dogName || profile.name,
      senderAvatarUrl: profile.avatarUrl,
      body: trimmed,
    });
    setMessages((prev) => [...prev, sent]);
    setBody('');
    setNotice('');
  };

  if (!profile) return null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.back()}>
          <FontAwesome6 name="arrow-left" size={14} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{peerName}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.messages}>
        {messages.length === 0 ? <Text style={[styles.notice, { color: colors.mutedText }]}>最初のメッセージを送ってみましょう。</Text> : null}
        {messages.map((message) => {
          const mine = message.senderExternalId === profile.externalId;
          return (
            <View key={message.id} style={[styles.bubble, mine ? styles.mine : styles.theirs, { backgroundColor: mine ? colors.accent : colors.surface }]}>
              <Text style={[styles.bubbleText, { color: mine ? colors.accentContrast : colors.text }]}>{message.body}</Text>
            </View>
          );
        })}
      </ScrollView>
      {notice ? <Text style={[styles.notice, { color: colors.mutedText }]}>{notice}</Text> : null}
      <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={body}
          onChangeText={setBody}
          placeholder="メッセージを入力"
          placeholderTextColor={colors.mutedText}
          multiline
        />
        <Pressable style={[styles.sendButton, { backgroundColor: colors.accent }]} onPress={() => void handleSend()}>
          <FontAwesome6 name="paper-plane" size={14} color={colors.accentContrast} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { minHeight: 54, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '900' },
  messages: { padding: 16, gap: 8 },
  bubble: { maxWidth: '78%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  mine: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  notice: { paddingHorizontal: 16, paddingVertical: 6, fontSize: 13 },
  composer: { margin: 12, borderRadius: 18, borderWidth: 1, padding: 8, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input: { flex: 1, minHeight: 38, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 8, fontSize: 14, textAlignVertical: 'top' },
  sendButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

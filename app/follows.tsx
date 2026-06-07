import { FontAwesome6 } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';
import { hasSupabaseEnv } from '@/lib/supabase';
import { listFollowerUsers, listFollowingUsers, type AppUserRow } from '@/lib/user-data';

function Avatar({ uri, label }: { uri: string; label: string }) {
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

export default function FollowsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ user?: string; type?: string }>();
  const externalId = typeof params.user === 'string' ? decodeURIComponent(params.user) : '';
  const type = params.type === 'following' ? 'following' : 'followers';
  const title = type === 'followers' ? 'フォロワー' : 'フォロー中';
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const [users, setUsers] = useState<AppUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    if (!externalId) return;
    setLoading(true);
    setMessage('');
    if (!hasSupabaseEnv) {
      setUsers([]);
      setLoading(false);
      return;
    }
    try {
      const rows = type === 'followers' ? await listFollowerUsers(externalId) : await listFollowingUsers(externalId);
      setUsers(rows);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '一覧の読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [externalId, type]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={14} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>

        {loading ? <Text style={[styles.message, { color: colors.mutedText }]}>読み込み中...</Text> : null}
        {!loading && users.length === 0 ? <Text style={[styles.message, { color: colors.mutedText }]}>表示できるユーザーはいません。</Text> : null}
        {users.map((user) => {
          const displayName = user.dog_name || user.name || 'ユーザー';
          const sub = [user.dog_breed, user.prefecture, user.city].filter(Boolean).join(' / ');
          return (
            <Pressable
              key={user.external_id}
              style={[styles.userRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => router.push(`/user/${encodeURIComponent(user.external_id)}` as never)}>
              <Avatar uri={user.avatar_url ?? ''} label={displayName} />
              <View style={styles.userBody}>
                <Text style={[styles.userName, { color: colors.text }]}>{displayName}</Text>
                {sub ? <Text style={[styles.userSub, { color: colors.mutedText }]}>{sub}</Text> : null}
              </View>
              <FontAwesome6 name="chevron-right" size={13} color={colors.mutedText} />
            </Pressable>
          );
        })}
        {message ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 14, paddingBottom: 34, gap: 10 },
  header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '900' },
  userRow: { minHeight: 70, borderRadius: 14, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  userBody: { flex: 1, gap: 3 },
  userName: { fontSize: 15, fontWeight: '900' },
  userSub: { fontSize: 12, lineHeight: 17 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadfce' },
  avatarIcon: { fontSize: 24 },
  avatarInitial: { color: '#6b4f2f', fontSize: 17, fontWeight: '900' },
  message: { fontSize: 13, lineHeight: 19 },
});

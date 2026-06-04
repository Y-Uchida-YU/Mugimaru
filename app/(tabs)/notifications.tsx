import { FontAwesome6 } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { listNotifications, markNotificationsRead, type NotificationRow } from '@/lib/notifications';
import { getAvatarIconGlyph, parseAvatarValue } from '@/lib/profile-avatar';

function NotificationAvatar({ uri, label }: { uri: string | null; label: string }) {
  const parsed = parseAvatarValue(uri ?? '');
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

function typeIcon(type: NotificationRow['type']) {
  if (type === 'like') return 'heart';
  if (type === 'follow') return 'user-plus';
  return 'envelope';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const [items, setItems] = useState<NotificationRow[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    const rows = await listNotifications(profile.externalId);
    setItems(rows);
    await markNotificationsRead(profile.externalId);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (!profile) return null;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {items.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>通知はまだありません</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedText }]}>いいね、フォロー、DMが届くとここに表示されます。</Text>
          </View>
        ) : null}
        {items.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.item, { backgroundColor: colors.surface, borderColor: item.read_at ? colors.border : colors.accent }]}
            onPress={() => {
              if (item.post_id) router.push(`/post/${encodeURIComponent(item.post_id)}` as never);
              else if (item.type === 'dm' && item.actor_external_id) router.push(`/dm/${encodeURIComponent(item.actor_external_id)}` as never);
              else router.push(`/user/${encodeURIComponent(item.actor_external_id)}` as never);
            }}>
            <NotificationAvatar uri={item.actor_avatar_url} label={item.actor_name} />
            <View style={styles.itemBody}>
              <Text style={[styles.itemTitle, { color: colors.text }]}>{item.actor_name}</Text>
              <Text style={[styles.itemText, { color: colors.mutedText }]} numberOfLines={2}>
                {item.body}
              </Text>
            </View>
            <FontAwesome6 name={typeIcon(item.type)} size={15} color={colors.accent} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { padding: 10, paddingBottom: 28, gap: 8 },
  empty: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  emptyTitle: { fontSize: 16, fontWeight: '900' },
  emptyBody: { fontSize: 13, lineHeight: 19 },
  item: { minHeight: 68, borderRadius: 12, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemBody: { flex: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '900' },
  itemText: { fontSize: 13, lineHeight: 18 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadfce' },
  avatarIcon: { fontSize: 23 },
  avatarInitial: { color: '#6b4f2f', fontSize: 16, fontWeight: '900' },
});

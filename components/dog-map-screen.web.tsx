import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { listSpots, type Spot, type SpotType } from '@/lib/dog-community-data';
import { hasSupabaseEnv } from '@/lib/supabase';

type FilterType = 'all' | SpotType;

const FILTERS: { id: FilterType; label: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
  { id: 'all', label: 'すべて', icon: 'paw' },
  { id: 'dogrun', label: 'ドッグラン', icon: 'dog' },
  { id: 'vet', label: '動物病院', icon: 'stethoscope' },
  { id: 'cafe', label: 'カフェ', icon: 'mug-hot' },
  { id: 'shop', label: 'ショップ', icon: 'bag-shopping' },
];

const TYPE_META: Record<SpotType, { label: string; icon: keyof typeof FontAwesome6.glyphMap; tint: string; tone: string }> = {
  dogrun: { label: 'ドッグラン', icon: 'dog', tint: '#e66b52', tone: '#fff1ea' },
  vet: { label: '動物病院', icon: 'stethoscope', tint: '#2d89d3', tone: '#edf6ff' },
  cafe: { label: 'カフェ', icon: 'mug-hot', tint: '#2fa878', tone: '#ebfbf4' },
  shop: { label: 'ショップ', icon: 'bag-shopping', tint: '#9560d4', tone: '#f5efff' },
};

function googleUrl(spot: Spot) {
  return `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`;
}

export default function MapWebScreen() {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;

  const [spots, setSpots] = useState<Spot[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!hasSupabaseEnv) {
        setMessage('Supabase設定が未設定のため、スポットを読み込めません。');
        return;
      }
      try {
        setLoading(true);
        const rows = await listSpots();
        if (!active) return;
        setSpots(rows);
        setMessage(rows.length ? 'スポットを読み込みました。' : 'スポットはまだありません。');
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'スポットの読み込みに失敗しました。');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const filteredSpots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return spots.filter((spot) => {
      if (filterType !== 'all' && spot.type !== filterType) return false;
      if (!normalizedQuery) return true;
      return [spot.name, TYPE_META[spot.type].label, spot.address ?? '', spot.created_by_name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [filterType, query, spots]);

  const openMap = async (spot: Spot) => {
    try {
      await Linking.openURL(googleUrl(spot));
      setMessage('');
    } catch {
      setMessage('Googleマップを開けませんでした。');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <View style={styles.heroTextWrap}>
            <Text style={[styles.heroEyebrow, { color: colors.mutedText }]}>マップ</Text>
            <Text style={[styles.heroTitle, { color: colors.text }]}>近くの犬向けスポット</Text>
            <Text style={[styles.heroCaption, { color: colors.mutedText }]}>
              ドッグラン、動物病院、カフェ、ショップを探せます。気になる場所はGoogleマップで確認できます。
            </Text>
          </View>
          <View style={[styles.heroCountPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.heroCountValue, { color: colors.text }]}>{filteredSpots.length}</Text>
            <Text style={[styles.heroCountLabel, { color: colors.mutedText }]}>表示中</Text>
          </View>
        </View>

        <View style={[styles.controlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <FontAwesome6 name="magnifying-glass" size={14} color={colors.mutedText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="スポット、種類、エリアで検索"
              placeholderTextColor={colors.mutedText}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((filter) => {
              const active = filter.id === filterType;
              return (
                <Pressable
                  key={filter.id}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: active ? colors.accent : colors.background,
                      borderColor: active ? colors.accent : colors.border,
                    },
                  ]}
                  onPress={() => setFilterType(filter.id)}>
                  <FontAwesome6 name={filter.icon} size={12} color={active ? colors.accentContrast : colors.text} />
                  <Text style={[styles.filterText, { color: active ? colors.accentContrast : colors.text }]}>{filter.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {message ? (
          <View style={[styles.messagePill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {loading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
            <Text style={[styles.messageText, { color: colors.mutedText }]}>{message}</Text>
          </View>
        ) : null}

        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>スポット一覧</Text>
            <Text style={[styles.listMeta, { color: colors.mutedText }]}>{filteredSpots.length}件</Text>
          </View>

          {!filteredSpots.length && !loading ? (
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>条件に一致するスポットはありません。</Text>
          ) : null}

          {filteredSpots.map((spot) => {
            const meta = TYPE_META[spot.type];
            return (
              <Pressable
                key={spot.id}
                style={[styles.spotCard, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => void openMap(spot)}>
                <View style={[styles.spotIcon, { backgroundColor: meta.tone, borderColor: colors.border }]}>
                  <FontAwesome6 name={meta.icon} size={16} color={meta.tint} />
                </View>
                <View style={styles.spotBody}>
                  <Text style={[styles.spotTitle, { color: colors.text }]}>{spot.name}</Text>
                  <Text style={[styles.spotMeta, { color: colors.mutedText }]}>
                    {meta.label}{spot.address ? ` · ${spot.address}` : ''}
                  </Text>
                  <Text style={[styles.spotCoordinates, { color: colors.mutedText }]}>
                    {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
                  </Text>
                </View>
                <FontAwesome6 name="arrow-up-right-from-square" size={14} color={colors.accent} />
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30, gap: 12 },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  heroTextWrap: { flex: 1, gap: 4 },
  heroEyebrow: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  heroTitle: { fontSize: 26, fontWeight: '800' },
  heroCaption: { fontSize: 13, lineHeight: 20 },
  heroCountPill: { minWidth: 82, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  heroCountValue: { fontSize: 20, fontWeight: '800' },
  heroCountLabel: { fontSize: 11, fontWeight: '700' },
  controlCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  searchWrap: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  filterRow: { gap: 8, paddingRight: 6 },
  filterChip: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterText: { fontSize: 12, fontWeight: '700' },
  messagePill: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  messageText: { flex: 1, fontSize: 12, lineHeight: 18 },
  listCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 17, fontWeight: '800' },
  listMeta: { fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13, lineHeight: 20 },
  spotCard: { minHeight: 78, borderRadius: 14, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  spotIcon: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  spotBody: { flex: 1, gap: 3 },
  spotTitle: { fontSize: 15, fontWeight: '800' },
  spotMeta: { fontSize: 12, lineHeight: 18 },
  spotCoordinates: { fontSize: 11, fontWeight: '700' },
});

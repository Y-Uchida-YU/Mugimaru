import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import MapView, { Marker, UrlTile, type LatLng, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import {
  createReview,
  createSpot,
  listReviews,
  listSpots,
  type Review,
  type Spot,
  type SpotType,
} from '@/lib/dog-community-data';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { getAppText } from '@/lib/i18n';
import { hasSupabaseEnv } from '@/lib/supabase';

type FilterType = 'all' | SpotType;

const DEFAULT_REGION: Region = {
  latitude: 35.681236,
  longitude: 139.767125,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

function useCopy(isJapan: boolean) {
  return isJapan
    ? {
        searchPlaceholder: 'スポット・エリアを検索',
        nearby: '近くの犬スポット',
        dogMap: 'ドッグマップ',
        noMatch: '条件に合うスポットがありません。',
        visible: '表示中',
        reviewsAvg: '評価',
        reviewsCount: (n: number) => `${n}件のレビュー`,
        noReviews: 'まだレビューがありません',
        openMap: '地図アプリで開く',
        reviews: 'レビュー',
        writeReview: 'レビューを書く',
        reviewPlaceholder: '清潔さ・犬フレンドリー度・混雑など',
        submitReview: '投稿する',
        guestReview: 'ゲストはレビューを投稿できません。',
        addSpot: 'スポットを追加',
        addSpotHint: '地図を動かして中央に合わせるか、地図を長押しして登録できます。',
        placingTitle: '登録する位置を合わせる',
        placingHint: '地図を動かして中央のピンを目的の場所に合わせてください。',
        placeHere: 'ここに登録',
        cancel: 'キャンセル',
        newSpotTitle: '新しいスポット',
        spotNamePlaceholder: 'スポット名（例：〇〇ドッグラン）',
        addressPlaceholder: '住所・目印（任意）',
        chooseType: 'カテゴリ',
        save: '登録する',
        nameRequired: 'スポット名を入力してください。',
        savedSpot: 'スポットを登録しました。',
        savedLocal: '端末に登録しました（Supabase未設定）。',
        failedSave: '登録に失敗しました。',
        guestSpot: 'ゲストはスポットを登録できません。',
        envMissing: 'Supabase未設定のため、サンプルデータは読み込まれません。',
        tapToRate: 'タップで評価',
      }
    : {
        searchPlaceholder: 'Search spots or area',
        nearby: 'Nearby dog spots',
        dogMap: 'Dog Map',
        noMatch: 'No spot matches your filter.',
        visible: 'Visible',
        reviewsAvg: 'Rating',
        reviewsCount: (n: number) => `${n} reviews`,
        noReviews: 'No reviews yet',
        openMap: 'Open in Maps',
        reviews: 'Reviews',
        writeReview: 'Write a review',
        reviewPlaceholder: 'Cleanliness, dog-friendliness, crowd...',
        submitReview: 'Post review',
        guestReview: 'Guests cannot post reviews.',
        addSpot: 'Add a spot',
        addSpotHint: 'Center the map on a place, or long-press the map to register.',
        placingTitle: 'Position the new spot',
        placingHint: 'Move the map so the center pin sits on the place.',
        placeHere: 'Place here',
        cancel: 'Cancel',
        newSpotTitle: 'New spot',
        spotNamePlaceholder: 'Spot name (e.g. Riverside Dog Run)',
        addressPlaceholder: 'Address or landmark (optional)',
        chooseType: 'Category',
        save: 'Register',
        nameRequired: 'Please enter a spot name.',
        savedSpot: 'Spot registered.',
        savedLocal: 'Saved on device (Supabase not set).',
        failedSave: 'Failed to register spot.',
        guestSpot: 'Guests cannot register spots.',
        envMissing: 'Supabase env is missing. Sample data is not loaded.',
        tapToRate: 'Tap to rate',
      };
}

function typeMeta(isJapan: boolean): Record<SpotType, { label: string; short: string; icon: keyof typeof FontAwesome6.glyphMap; tone: string; tint: string }> {
  return {
    dogrun: { label: isJapan ? 'ドッグラン' : 'Dog run', short: isJapan ? 'ラン' : 'Run', icon: 'dog', tone: '#fff1ea', tint: '#e66b52' },
    vet: { label: isJapan ? '動物病院' : 'Vet', short: isJapan ? '病院' : 'Vet', icon: 'stethoscope', tone: '#edf6ff', tint: '#2d89d3' },
    cafe: { label: isJapan ? 'カフェ' : 'Cafe', short: isJapan ? 'カフェ' : 'Cafe', icon: 'mug-hot', tone: '#ebfbf4', tint: '#2fa878' },
    shop: { label: isJapan ? 'ショップ' : 'Shop', short: isJapan ? '店' : 'Shop', icon: 'bag-shopping', tone: '#f5efff', tint: '#9560d4' },
  };
}

function distanceKm(from: LatLng, to: LatLng) {
  const r = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let localIdCounter = 0;
function makeLocalId(prefix: string) {
  localIdCounter += 1;
  return `${prefix}-${localIdCounter}-${Math.round(Math.random() * 1e6)}`;
}

function googleUrl(spot: Spot) {
  return `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`;
}

function appleUrl(spot: Spot) {
  return `http://maps.apple.com/?ll=${spot.latitude},${spot.longitude}&q=${encodeURIComponent(spot.name)}`;
}

function Stars({ value, size = 13, color, muted }: { value: number; size?: number; color: string; muted: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <FontAwesome6 key={i} name="star" size={size} solid={i <= Math.round(value)} color={i <= Math.round(value) ? color : muted} />
      ))}
    </View>
  );
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const text = getAppText();
  const isJapan = text.localeGroup === 'japan';
  const copy = useCopy(isJapan);
  const TYPE_META = useMemo(() => typeMeta(isJapan), [isJapan]);
  const { profile } = useAuth();
  const isGuest = profile?.provider === 'guest';

  const FILTERS: { id: FilterType; label: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
    { id: 'all', label: isJapan ? 'すべて' : 'All', icon: 'paw' },
    { id: 'dogrun', label: TYPE_META.dogrun.label, icon: 'dog' },
    { id: 'vet', label: TYPE_META.vet.label, icon: 'stethoscope' },
    { id: 'cafe', label: TYPE_META.cafe.label, icon: 'mug-hot' },
    { id: 'shop', label: TYPE_META.shop.label, icon: 'bag-shopping' },
  ];

  const [spots, setSpots] = useState<Spot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [ratingValue, setRatingValue] = useState(5);
  const [comment, setComment] = useState('');

  // Add-spot flow
  const [placing, setPlacing] = useState(false);
  const [draft, setDraft] = useState<{ coordinate: LatLng; name: string; address: string; type: SpotType } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!hasSupabaseEnv) {
        if (active) setMessage(copy.envMissing);
        return;
      }
      try {
        setLoading(true);
        const rows = await listSpots();
        if (!active) return;
        setSpots(rows);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : copy.failedSave);
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSpotId || !hasSupabaseEnv) {
      setReviews([]);
      return;
    }
    let active = true;
    const load = async () => {
      try {
        setReviewsLoading(true);
        const rows = await listReviews(selectedSpotId);
        if (!active) return;
        setReviews(rows);
      } catch {
        if (active) setReviews([]);
      } finally {
        if (active) setReviewsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedSpotId]);

  const filteredSpots = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    return spots.filter((spot) => {
      if (filterType !== 'all' && spot.type !== filterType) return false;
      if (!q) return true;
      return [spot.name, TYPE_META[spot.type].label, spot.address ?? '', spot.created_by_name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [filterType, searchKeyword, spots, TYPE_META]);

  const selectedSpot = useMemo(() => spots.find((spot) => spot.id === selectedSpotId) ?? null, [selectedSpotId, spots]);

  const nearbySpots = useMemo(() => {
    const center = { latitude: region.latitude, longitude: region.longitude };
    return filteredSpots
      .map((spot) => ({ spot, distance: distanceKm(center, { latitude: spot.latitude, longitude: spot.longitude }) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 12);
  }, [filteredSpots, region.latitude, region.longitude]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return null;
    return reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;
  }, [reviews]);

  const selectSpot = (spot: Spot) => {
    setSelectedSpotId(spot.id);
    const nextRegion = {
      latitude: spot.latitude,
      longitude: spot.longitude,
      latitudeDelta: Math.max(region.latitudeDelta * 0.65, 0.012),
      longitudeDelta: Math.max(region.longitudeDelta * 0.65, 0.012),
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 240);
  };

  const resetToDefaultRegion = () => {
    setSelectedSpotId(null);
    setRegion(DEFAULT_REGION);
    mapRef.current?.animateToRegion(DEFAULT_REGION, 240);
  };

  const openMap = async (target: 'default' | 'google' | 'apple') => {
    if (!selectedSpot) return;
    try {
      const url =
        target === 'google'
          ? googleUrl(selectedSpot)
          : target === 'apple'
          ? appleUrl(selectedSpot)
          : Platform.OS === 'ios'
          ? appleUrl(selectedSpot)
          : googleUrl(selectedSpot);
      await Linking.openURL(url);
    } catch {
      setMessage(copy.failedSave);
    }
  };

  const startPlacing = () => {
    if (isGuest) return setMessage(copy.guestSpot);
    setSelectedSpotId(null);
    setPlacing(true);
  };

  const openDraft = (coordinate: LatLng) => {
    if (isGuest) return setMessage(copy.guestSpot);
    setPlacing(false);
    setDraft({ coordinate, name: '', address: '', type: 'dogrun' });
  };

  const confirmPlacing = () => {
    openDraft({ latitude: region.latitude, longitude: region.longitude });
  };

  const saveSpot = async () => {
    if (!draft) return;
    if (!draft.name.trim()) return setMessage(copy.nameRequired);
    const payload: Omit<Spot, 'id' | 'created_at'> = {
      name: draft.name.trim(),
      type: draft.type,
      latitude: draft.coordinate.latitude,
      longitude: draft.coordinate.longitude,
      address: draft.address.trim() || null,
      source: 'user',
      created_by_external_id: profile?.externalId ?? null,
      created_by_name: profile?.name || (isJapan ? '名無し' : 'Anonymous'),
    };
    try {
      setSaving(true);
      let created: Spot;
      if (hasSupabaseEnv) {
        created = await createSpot(payload);
        setMessage(copy.savedSpot);
      } else {
        created = { ...payload, id: makeLocalId('local') } as Spot;
        setMessage(copy.savedLocal);
      }
      setSpots((prev) => [created, ...prev]);
      setDraft(null);
      selectSpot(created);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.failedSave);
    } finally {
      setSaving(false);
    }
  };

  const saveReview = async () => {
    if (isGuest) return setMessage(copy.guestReview);
    if (!selectedSpot) return;
    if (!comment.trim()) return;
    const rating = Math.max(1, Math.min(5, Math.round(ratingValue)));
    try {
      if (hasSupabaseEnv) {
        const created = await createReview({
          spot_id: selectedSpot.id,
          author_external_id: profile?.externalId ?? null,
          author_name: profile?.name || (isJapan ? '名無し' : 'Anonymous'),
          rating,
          comment: comment.trim(),
        });
        setReviews((prev) => [created, ...prev]);
      } else {
        const localReview: Review = {
          id: makeLocalId('local'),
          spot_id: selectedSpot.id,
          author_name: profile?.name || (isJapan ? '名無し' : 'Anonymous'),
          rating,
          comment: comment.trim(),
        };
        setReviews((prev) => [localReview, ...prev]);
      }
      setComment('');
      setRatingValue(5);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : copy.failedSave);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={setRegion}
        onLongPress={(e) => openDraft(e.nativeEvent.coordinate)}
        toolbarEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}>
        <UrlTile urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maximumZ={19} shouldReplaceMapContent />
        {filteredSpots.map((spot) => {
          const meta = TYPE_META[spot.type];
          const selected = spot.id === selectedSpotId;
          return (
            <Marker key={spot.id} coordinate={{ latitude: spot.latitude, longitude: spot.longitude }} anchor={{ x: 0.5, y: 1 }} onPress={() => selectSpot(spot)}>
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: selected ? colors.accent : colors.border }]}>
                  <FontAwesome6 name={meta.icon} size={12} solid color={selected ? colors.accentContrast : meta.tint} />
                  {selected ? <Text style={[styles.markerLabel, { color: colors.accentContrast }]}>{meta.short}</Text> : null}
                </View>
                <View style={[styles.markerPointer, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: colors.border }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Center pin for placing mode */}
      {placing ? (
        <View pointerEvents="none" style={styles.centerPinWrap}>
          <View style={[styles.centerPin, { backgroundColor: colors.accent, borderColor: colors.accentContrast }]}>
            <FontAwesome6 name="paw" size={16} solid color={colors.accentContrast} />
          </View>
          <View style={[styles.centerPinStem, { backgroundColor: colors.accent }]} />
          <View style={[styles.centerPinShadow, { borderColor: colors.accent }]} />
        </View>
      ) : null}

      {/* Top search + filters (hidden while placing/adding for focus) */}
      {!placing && !draft ? (
        <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.searchRow}>
              <FontAwesome6 name="magnifying-glass" size={15} color={colors.mutedText} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                value={searchKeyword}
                onChangeText={setSearchKeyword}
                placeholder={copy.searchPlaceholder}
                placeholderTextColor={colors.mutedText}
              />
              {searchKeyword ? (
                <Pressable hitSlop={8} onPress={() => setSearchKeyword('')}>
                  <FontAwesome6 name="circle-xmark" size={16} solid color={colors.mutedText} />
                </Pressable>
              ) : null}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {FILTERS.map((filter) => {
                const active = filter.id === filterType;
                return (
                  <Pressable
                    key={filter.id}
                    style={[styles.filterChip, { backgroundColor: active ? colors.accent : colors.background, borderColor: active ? colors.accent : colors.border }]}
                    onPress={() => setFilterType(filter.id)}>
                    <FontAwesome6 name={filter.icon} size={12} solid color={active ? colors.accentContrast : colors.mutedText} />
                    <Text style={[styles.filterText, { color: active ? colors.accentContrast : colors.text }]}>{filter.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {/* Placing banner */}
      {placing ? (
        <View style={[styles.placingBanner, { top: insets.top + 12, backgroundColor: colors.surface, borderColor: colors.border }]}>
          <FontAwesome6 name="location-dot" size={15} solid color={colors.accent} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.placingTitle, { color: colors.text }]}>{copy.placingTitle}</Text>
            <Text style={[styles.placingHint, { color: colors.mutedText }]}>{copy.placingHint}</Text>
          </View>
        </View>
      ) : null}

      {/* Right side rail */}
      {!draft ? (
        <View style={[styles.sideRail, { top: insets.top + (placing ? 96 : 138) }]}>
          <Pressable style={[styles.railButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={resetToDefaultRegion}>
            <FontAwesome6 name="location-crosshairs" size={16} color={colors.text} />
          </Pressable>
        </View>
      ) : null}

      {/* Placing confirm bar */}
      {placing ? (
        <View style={[styles.confirmBar, { paddingBottom: Math.max(insets.bottom, 14), backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Pressable style={[styles.ghostBtn, { borderColor: colors.border }]} onPress={() => setPlacing(false)}>
            <Text style={[styles.ghostBtnText, { color: colors.text }]}>{copy.cancel}</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }]} onPress={confirmPlacing}>
            <FontAwesome6 name="check" size={13} color={colors.accentContrast} />
            <Text style={[styles.primaryBtnText, { color: colors.accentContrast }]}>{copy.placeHere}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Bottom sheet (browse / detail) */}
      {!placing && !draft ? (
        <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.handleWrap}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <View style={styles.sheetHeader}>
            <View style={styles.sheetTitleWrap}>
              <Text style={[styles.sheetEyebrow, { color: colors.accent }]}>{copy.dogMap}</Text>
              <Text style={[styles.sheetTitle, { color: colors.text }]} numberOfLines={1}>
                {selectedSpot ? selectedSpot.name : copy.nearby}
              </Text>
            </View>
            {selectedSpot ? (
              <Pressable style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setSelectedSpotId(null)}>
                <FontAwesome6 name="xmark" size={14} color={colors.text} />
              </Pressable>
            ) : (
              <View style={[styles.countPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.countValue, { color: colors.text }]}>{filteredSpots.length}</Text>
                <Text style={[styles.countLabel, { color: colors.mutedText }]}>{copy.visible}</Text>
              </View>
            )}
          </View>

          <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {selectedSpot ? (
              <View style={{ gap: 12 }}>
                <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <View style={styles.selectedTop}>
                    <View style={[styles.badge, { backgroundColor: TYPE_META[selectedSpot.type].tone, borderColor: colors.border }]}>
                      <FontAwesome6 name={TYPE_META[selectedSpot.type].icon} size={12} solid color={TYPE_META[selectedSpot.type].tint} />
                      <Text style={[styles.badgeText, { color: '#333' }]}>{TYPE_META[selectedSpot.type].label}</Text>
                    </View>
                    <View style={styles.ratingInline}>
                      <Stars value={avgRating ?? 0} color={colors.accent} muted={colors.border} />
                      <Text style={[styles.ratingValue, { color: colors.text }]}>{avgRating == null ? '—' : avgRating.toFixed(1)}</Text>
                    </View>
                  </View>
                  {selectedSpot.address ? <Text style={[styles.blockCaption, { color: colors.mutedText }]}>{selectedSpot.address}</Text> : null}
                  <Text style={[styles.reviewMetaLine, { color: colors.mutedText }]}>
                    {avgRating == null ? copy.noReviews : copy.reviewsCount(reviews.length)}
                    {selectedSpot.created_by_name ? ` · ${selectedSpot.created_by_name}` : ''}
                  </Text>

                  <View style={styles.actionRow}>
                    <Pressable style={[styles.primaryAction, { backgroundColor: colors.accent }]} onPress={() => void openMap('default')}>
                      <FontAwesome6 name="diamond-turn-right" size={13} color={colors.accentContrast} />
                      <Text style={[styles.primaryActionText, { color: colors.accentContrast }]}>{copy.openMap}</Text>
                    </Pressable>
                    <Pressable style={[styles.secondaryAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => void openMap('google')}>
                      <Text style={[styles.secondaryActionText, { color: colors.text }]}>Google</Text>
                    </Pressable>
                    {Platform.OS === 'ios' ? (
                      <Pressable style={[styles.secondaryAction, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => void openMap('apple')}>
                        <Text style={[styles.secondaryActionText, { color: colors.text }]}>Apple</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>

                {/* Review composer */}
                <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.blockTitle, { color: colors.text }]}>{copy.writeReview}</Text>
                  <View style={styles.starPicker}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Pressable key={i} hitSlop={6} onPress={() => setRatingValue(i)}>
                        <FontAwesome6 name="star" size={26} solid={i <= ratingValue} color={i <= ratingValue ? colors.accent : colors.border} />
                      </Pressable>
                    ))}
                    <Text style={[styles.starHint, { color: colors.mutedText }]}>{copy.tapToRate}</Text>
                  </View>
                  <TextInput
                    style={[styles.reviewInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                    value={comment}
                    onChangeText={setComment}
                    placeholder={copy.reviewPlaceholder}
                    placeholderTextColor={colors.mutedText}
                    multiline
                  />
                  <Pressable
                    style={[styles.primaryButton, { backgroundColor: colors.accent }, isGuest || !comment.trim() ? styles.disabled : null]}
                    onPress={() => void saveReview()}
                    disabled={isGuest || !comment.trim()}>
                    <Text style={[styles.primaryButtonText, { color: colors.accentContrast }]}>{copy.submitReview}</Text>
                  </Pressable>
                  {isGuest ? <Text style={[styles.reviewMetaLine, { color: colors.mutedText }]}>{copy.guestReview}</Text> : null}
                </View>

                {/* Reviews list */}
                <View style={styles.reviewHeader}>
                  <Text style={[styles.blockTitle, { color: colors.text }]}>{copy.reviews}</Text>
                  {reviewsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
                </View>
                {!reviews.length && !reviewsLoading ? <Text style={[styles.blockCaption, { color: colors.mutedText }]}>{copy.noReviews}</Text> : null}
                {reviews.map((review) => (
                  <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.reviewRow}>
                      <Text style={[styles.reviewAuthor, { color: colors.text }]}>{review.author_name}</Text>
                      <Stars value={review.rating} size={11} color={colors.accent} muted={colors.border} />
                    </View>
                    <Text style={[styles.reviewBody, { color: colors.mutedText }]}>{review.comment}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.listWrap}>
                {!nearbySpots.length ? <Text style={[styles.blockCaption, { color: colors.mutedText }]}>{copy.noMatch}</Text> : null}
                {nearbySpots.map(({ spot, distance }) => (
                  <Pressable key={spot.id} style={[styles.listItem, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => selectSpot(spot)}>
                    <View style={[styles.listIcon, { backgroundColor: TYPE_META[spot.type].tone, borderColor: colors.border }]}>
                      <FontAwesome6 name={TYPE_META[spot.type].icon} size={14} solid color={TYPE_META[spot.type].tint} />
                    </View>
                    <View style={styles.listBody}>
                      <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{spot.name}</Text>
                      <Text style={[styles.listMeta, { color: colors.mutedText }]} numberOfLines={1}>
                        {TYPE_META[spot.type].label}
                        {spot.address ? ` · ${spot.address}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.listDistance, { color: colors.mutedText }]}>{distance.toFixed(1)}km</Text>
                  </Pressable>
                ))}
                <Text style={[styles.attribution, { color: colors.mutedText }]}>Map tiles: OpenStreetMap contributors</Text>
              </View>
            )}
          </ScrollView>
        </View>
      ) : null}

      {/* Add-spot FAB */}
      {!placing && !draft ? (
        <Pressable
          style={[styles.fab, { bottom: Math.max(insets.bottom, 12) + 24, backgroundColor: colors.accent, borderColor: colors.accentContrast }]}
          onPress={startPlacing}>
          <FontAwesome6 name="plus" size={18} color={colors.accentContrast} />
        </Pressable>
      ) : null}

      {/* Message toast */}
      {message && !draft ? (
        <View style={[styles.toast, { bottom: Math.max(insets.bottom, 12) + (placing ? 96 : 24), backgroundColor: colors.text }]}>
          {loading ? <ActivityIndicator size="small" color={colors.background} /> : null}
          <Text style={[styles.toastText, { color: colors.background }]} numberOfLines={2}>{message}</Text>
          <Pressable hitSlop={8} onPress={() => setMessage('')}>
            <FontAwesome6 name="xmark" size={13} color={colors.background} />
          </Pressable>
        </View>
      ) : null}

      {/* Add-spot form */}
      {draft ? (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.formOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setDraft(null)} />
          <View style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handleWrap}>
              <View style={[styles.handle, { backgroundColor: colors.border }]} />
            </View>
            <Text style={[styles.formTitle, { color: colors.text }]}>{copy.newSpotTitle}</Text>
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={draft.name}
              onChangeText={(name) => setDraft((prev) => (prev ? { ...prev, name } : prev))}
              placeholder={copy.spotNamePlaceholder}
              placeholderTextColor={colors.mutedText}
              autoFocus
            />
            <TextInput
              style={[styles.formInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
              value={draft.address}
              onChangeText={(address) => setDraft((prev) => (prev ? { ...prev, address } : prev))}
              placeholder={copy.addressPlaceholder}
              placeholderTextColor={colors.mutedText}
            />
            <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>{copy.chooseType}</Text>
            <View style={styles.typeGrid}>
              {(Object.keys(TYPE_META) as SpotType[]).map((type) => {
                const active = draft.type === type;
                const meta = TYPE_META[type];
                return (
                  <Pressable
                    key={type}
                    style={[styles.typeOption, { backgroundColor: active ? colors.accent : colors.background, borderColor: active ? colors.accent : colors.border }]}
                    onPress={() => setDraft((prev) => (prev ? { ...prev, type } : prev))}>
                    <FontAwesome6 name={meta.icon} size={13} solid color={active ? colors.accentContrast : meta.tint} />
                    <Text style={[styles.typeOptionText, { color: active ? colors.accentContrast : colors.text }]}>{meta.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.formActions}>
              <Pressable style={[styles.ghostBtn, { borderColor: colors.border }]} onPress={() => setDraft(null)}>
                <Text style={[styles.ghostBtnText, { color: colors.text }]}>{copy.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.primaryBtn, { backgroundColor: colors.accent }, saving ? styles.disabled : null]} onPress={() => void saveSpot()} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={colors.accentContrast} /> : <FontAwesome6 name="paw" size={13} solid color={colors.accentContrast} />}
                <Text style={[styles.primaryBtnText, { color: colors.accentContrast }]}>{copy.save}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topOverlay: { position: 'absolute', left: 14, right: 14, gap: 10 },
  searchCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterRow: { gap: 8, paddingRight: 4 },
  filterChip: { minHeight: 36, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterText: { fontSize: 13, fontWeight: '700' },
  sideRail: { position: 'absolute', right: 14, gap: 10 },
  railButton: {
    width: 46,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  markerWrap: { alignItems: 'center' },
  markerBubble: { minWidth: 34, height: 34, paddingHorizontal: 9, borderRadius: 17, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  markerLabel: { fontSize: 11, fontWeight: '800' },
  markerPointer: { width: 11, height: 11, borderWidth: 1.5, transform: [{ rotate: '45deg' }], marginTop: -6 },
  centerPinWrap: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  centerPin: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  centerPinStem: { width: 3, height: 14, borderRadius: 2 },
  centerPinShadow: { width: 14, height: 5, borderRadius: 5, borderWidth: 1.5, opacity: 0.4, marginTop: 1 },
  placingBanner: { position: 'absolute', left: 14, right: 14, borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  placingTitle: { fontSize: 15, fontWeight: '800' },
  placingHint: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  confirmBar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 14, flexDirection: 'row', gap: 12 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: '40%',
    maxHeight: '62%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  handleWrap: { alignItems: 'center', marginBottom: 10 },
  handle: { width: 46, height: 5, borderRadius: 999 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 },
  sheetTitleWrap: { flex: 1, gap: 2 },
  sheetEyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase' },
  sheetTitle: { fontSize: 21, fontWeight: '800' },
  closeButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  countPill: { minWidth: 60, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  countValue: { fontSize: 18, fontWeight: '800' },
  countLabel: { fontSize: 10, fontWeight: '700' },
  sheetScroll: { flex: 1 },
  sheetContent: { paddingBottom: 12 },
  card: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 12 },
  selectedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { minHeight: 32, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  ratingInline: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ratingValue: { fontSize: 15, fontWeight: '800' },
  blockTitle: { fontSize: 15, fontWeight: '800' },
  blockCaption: { fontSize: 13, lineHeight: 19 },
  reviewMetaLine: { fontSize: 12, lineHeight: 17 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryAction: { minHeight: 42, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 7, justifyContent: 'center' },
  primaryActionText: { fontSize: 13, fontWeight: '800' },
  secondaryAction: { minHeight: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
  starPicker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  starHint: { fontSize: 12, marginLeft: 4 },
  reviewInput: { minHeight: 66, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, fontSize: 14, textAlignVertical: 'top' },
  primaryButton: { minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  reviewAuthor: { fontSize: 13, fontWeight: '800' },
  reviewBody: { fontSize: 13, lineHeight: 19 },
  listWrap: { gap: 10 },
  listItem: { minHeight: 66, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listIcon: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listBody: { flex: 1, gap: 3 },
  listTitle: { fontSize: 14, fontWeight: '800' },
  listMeta: { fontSize: 12, lineHeight: 17 },
  listDistance: { fontSize: 12, fontWeight: '700' },
  attribution: { fontSize: 11, textAlign: 'center', marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  toast: { position: 'absolute', left: 16, right: 16, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  toastText: { flex: 1, fontSize: 13, fontWeight: '600' },
  formOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  formCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingHorizontal: 18, paddingTop: 10, gap: 12 },
  formTitle: { fontSize: 19, fontWeight: '800' },
  formInput: { minHeight: 48, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, fontSize: 15 },
  sectionLabel: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeOption: { minHeight: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeOptionText: { fontSize: 13, fontWeight: '700' },
  formActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  ghostBtn: { flex: 1, minHeight: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  ghostBtnText: { fontSize: 15, fontWeight: '700' },
  primaryBtn: { flex: 1.4, minHeight: 50, borderRadius: 16, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '800' },
});

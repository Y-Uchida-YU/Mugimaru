import { FontAwesome6 } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import MapView, { Marker, UrlTile, type LatLng, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import { createReview, listReviews, listSpots, type Review, type Spot, type SpotType } from '@/lib/dog-community-data';
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

const FILTERS: { id: FilterType; label: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'paw' },
  { id: 'dogrun', label: 'Dogrun', icon: 'dog' },
  { id: 'vet', label: 'Vet', icon: 'stethoscope' },
  { id: 'cafe', label: 'Cafe', icon: 'mug-hot' },
  { id: 'shop', label: 'Shop', icon: 'bag-shopping' },
];

const TYPE_META: Record<SpotType, { label: string; short: string; icon: keyof typeof FontAwesome6.glyphMap; tone: string; tint: string }> = {
  dogrun: { label: 'Dogrun', short: 'Run', icon: 'dog', tone: '#fff1ea', tint: '#e66b52' },
  vet: { label: 'Vet', short: 'Vet', icon: 'stethoscope', tone: '#edf6ff', tint: '#2d89d3' },
  cafe: { label: 'Cafe', short: 'Cafe', icon: 'mug-hot', tone: '#ebfbf4', tint: '#2fa878' },
  shop: { label: 'Shop', short: 'Shop', icon: 'bag-shopping', tone: '#f5efff', tint: '#9560d4' },
};

function distanceKm(from: LatLng, to: LatLng) {
  const r = 6371;
  const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
  const dLng = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function googleUrl(spot: Spot) {
  return `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`;
}

function appleUrl(spot: Spot) {
  return `http://maps.apple.com/?ll=${spot.latitude},${spot.longitude}&q=${encodeURIComponent(spot.name)}`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const text = getAppText();
  const { profile } = useAuth();
  const isGuest = profile?.provider === 'guest';

  const [spots, setSpots] = useState<Spot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [ratingText, setRatingText] = useState('5');
  const [comment, setComment] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!hasSupabaseEnv) {
        if (active) setMessage('Supabase env is missing. Seed map data is not loaded.');
        return;
      }
      try {
        setLoading(true);
        const rows = await listSpots();
        if (!active) return;
        setSpots(rows);
        setMessage(rows.length ? 'Spots loaded.' : 'No spots yet.');
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Failed to load spots.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
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
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : 'Failed to load reviews.');
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
      return [spot.name, TYPE_META[spot.type].label, spot.address ?? '', spot.created_by_name ?? ''].join(' ').toLowerCase().includes(q);
    });
  }, [filterType, searchKeyword, spots]);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedSpotId) ?? null,
    [selectedSpotId, spots]
  );

  const nearbySpots = useMemo(() => {
    const center = { latitude: region.latitude, longitude: region.longitude };
    return filteredSpots
      .map((spot) => ({ spot, distance: distanceKm(center, { latitude: spot.latitude, longitude: spot.longitude }) }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);
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
      latitudeDelta: Math.max(region.latitudeDelta * 0.65, 0.015),
      longitudeDelta: Math.max(region.longitudeDelta * 0.65, 0.015),
    };
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 220);
  };

  const resetToDefaultRegion = () => {
    setSelectedSpotId(null);
    setRegion(DEFAULT_REGION);
    mapRef.current?.animateToRegion(DEFAULT_REGION, 220);
  };

  const openMap = async (target: 'default' | 'google' | 'apple') => {
    if (!selectedSpot) {
      setMessage('Select a spot first.');
      return;
    }
    try {
      const url = target === 'google' ? googleUrl(selectedSpot) : target === 'apple' ? appleUrl(selectedSpot) : Platform.OS === 'ios' ? appleUrl(selectedSpot) : googleUrl(selectedSpot);
      await Linking.openURL(url);
    } catch {
      setMessage('Failed to open maps app.');
    }
  };

  const saveReview = async () => {
    if (isGuest) return setMessage('Guest users cannot post reviews.');
    if (!hasSupabaseEnv) return setMessage('Supabase env is missing.');
    if (!selectedSpot) return setMessage('Select a spot first.');
    const rating = Number(ratingText);
    if (!comment.trim() || Number.isNaN(rating)) return setMessage('Rating and comment are required.');
    try {
      const created = await createReview({
        spot_id: selectedSpot.id,
        author_external_id: profile?.externalId ?? null,
        author_name: profile?.name || text.board.anonymous,
        rating: Math.max(1, Math.min(5, Math.round(rating))),
        comment: comment.trim(),
      });
      setReviews((prev) => [created, ...prev]);
      setComment('');
      setRatingText('5');
      setMessage('Review submitted.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit review.');
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_REGION}
        onRegionChangeComplete={setRegion}
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
                  <FontAwesome6 name={meta.icon} size={11} color={selected ? colors.accentContrast : meta.tint} />
                  <Text style={[styles.markerLabel, { color: selected ? colors.accentContrast : colors.text }]}>{meta.short}</Text>
                </View>
                <View style={[styles.markerPointer, { backgroundColor: selected ? colors.accent : colors.surface, borderColor: colors.border }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.searchCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.searchRow}>
            <FontAwesome6 name="magnifying-glass" size={15} color={colors.mutedText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={searchKeyword}
              onChangeText={setSearchKeyword}
              placeholder="Search spots, type, area"
              placeholderTextColor={colors.mutedText}
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map((filter) => {
              const active = filter.id === filterType;
              return (
                <Pressable
                  key={filter.id}
                  style={[styles.filterChip, { backgroundColor: active ? colors.accent : colors.background, borderColor: active ? colors.accent : colors.border }]}
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
            <Text style={[styles.messageText, { color: colors.text }]}>{message}</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.sideRail, { top: insets.top + 138 }]}>
        <Pressable style={[styles.railButton, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={resetToDefaultRegion}>
          <FontAwesome6 name="location-crosshairs" size={16} color={colors.text} />
        </Pressable>
      </View>

      <View style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.handleWrap}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
        </View>
        <View style={styles.sheetHeader}>
          <View style={styles.sheetTitleWrap}>
            <Text style={[styles.sheetEyebrow, { color: colors.mutedText }]}>Dog Map</Text>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>{selectedSpot ? selectedSpot.name : 'Nearby Dog Spots'}</Text>
          </View>
          {selectedSpot ? (
            <Pressable style={[styles.closeButton, { borderColor: colors.border, backgroundColor: colors.background }]} onPress={() => setSelectedSpotId(null)}>
              <FontAwesome6 name="xmark" size={14} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView style={styles.sheetScroll} contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
          {selectedSpot ? (
            <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.selectedTop}>
                <View style={[styles.badge, { backgroundColor: TYPE_META[selectedSpot.type].tone, borderColor: colors.border }]}>
                  <FontAwesome6 name={TYPE_META[selectedSpot.type].icon} size={12} color={TYPE_META[selectedSpot.type].tint} />
                  <Text style={[styles.badgeText, { color: colors.text }]}>{TYPE_META[selectedSpot.type].label}</Text>
                </View>
              </View>
              {selectedSpot.address ? <Text style={[styles.blockCaption, { color: colors.mutedText }]}>{selectedSpot.address}</Text> : null}
              <View style={styles.ratingRow}>
                <FontAwesome6 name="star" size={13} color={colors.accent} />
                <Text style={[styles.rating, { color: colors.text }]}>{avgRating == null ? 'No reviews yet' : `${avgRating.toFixed(1)} / 5.0`}</Text>
                <Text style={[styles.ratingMeta, { color: colors.mutedText }]}>{reviews.length} reviews</Text>
              </View>

              <View style={styles.actionRow}>
                <Pressable style={[styles.primaryAction, { backgroundColor: colors.accent }]} onPress={() => void openMap('default')}>
                  <Text style={[styles.primaryActionText, { color: colors.accentContrast }]}>Open Map</Text>
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

              <View style={styles.reviewHeader}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>Reviews</Text>
                {reviewsLoading ? <ActivityIndicator size="small" color={colors.accent} /> : null}
              </View>
              {!reviews.length && !reviewsLoading ? <Text style={[styles.blockCaption, { color: colors.mutedText }]}>No reviews yet.</Text> : null}
              {reviews.map((review) => (
                <View key={review.id} style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.reviewRow}>
                    <Text style={[styles.reviewAuthor, { color: colors.text }]}>{review.author_name}</Text>
                    <Text style={[styles.reviewStars, { color: colors.accent }]}>{'★'.repeat(review.rating)}</Text>
                  </View>
                  <Text style={[styles.reviewBody, { color: colors.mutedText }]}>{review.comment}</Text>
                </View>
              ))}

              <View style={[styles.reviewComposer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.blockTitle, { color: colors.text }]}>Write review</Text>
                <View style={styles.composerRow}>
                  <TextInput
                    style={[styles.ratingInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={ratingText}
                    onChangeText={setRatingText}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.mutedText}
                  />
                  <TextInput
                    style={[styles.reviewInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                    value={comment}
                    onChangeText={setComment}
                    placeholder="Cleanliness, dog-friendliness, crowd..."
                    placeholderTextColor={colors.mutedText}
                  />
                </View>
                <Pressable style={[styles.primaryButton, { backgroundColor: colors.accent }, isGuest ? styles.disabled : null]} onPress={() => void saveReview()} disabled={isGuest}>
                  <Text style={[styles.primaryButtonText, { color: colors.accentContrast }]}>Submit Review</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.listWrap}>
              <View style={styles.statRow}>
                <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.mutedText }]}>Visible</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{filteredSpots.length}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.statLabel, { color: colors.mutedText }]}>Center</Text>
                  <Text style={[styles.statSmall, { color: colors.text }]}>{region.latitude.toFixed(3)}, {region.longitude.toFixed(3)}</Text>
                </View>
              </View>

              {!nearbySpots.length ? <Text style={[styles.blockCaption, { color: colors.mutedText }]}>No spot matches your current filter.</Text> : null}
              {nearbySpots.map(({ spot, distance }) => (
                <Pressable key={spot.id} style={[styles.listItem, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => selectSpot(spot)}>
                  <View style={[styles.listIcon, { backgroundColor: TYPE_META[spot.type].tone, borderColor: colors.border }]}>
                    <FontAwesome6 name={TYPE_META[spot.type].icon} size={13} color={TYPE_META[spot.type].tint} />
                  </View>
                  <View style={styles.listBody}>
                    <Text style={[styles.listTitle, { color: colors.text }]}>{spot.name}</Text>
                    <Text style={[styles.listMeta, { color: colors.mutedText }]}>{TYPE_META[spot.type].label}{spot.address ? ` · ${spot.address}` : ''}</Text>
                  </View>
                  <Text style={[styles.listDistance, { color: colors.mutedText }]}>{distance.toFixed(1)}km</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={[styles.attribution, { color: colors.mutedText }]}>Map tiles: OpenStreetMap contributors</Text>
        </ScrollView>
      </View>
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
  filterChip: { minHeight: 36, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterText: { fontSize: 13, fontWeight: '700' },
  messagePill: { alignSelf: 'flex-start', maxWidth: '96%', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  messageText: { fontSize: 12 },
  sideRail: { position: 'absolute', right: 14, gap: 10 },
  railButton: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  markerWrap: { alignItems: 'center' },
  markerBubble: { minWidth: 54, height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  markerLabel: { fontSize: 11, fontWeight: '800' },
  markerPointer: { width: 12, height: 12, borderWidth: 1, transform: [{ rotate: '45deg' }], marginTop: -6 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: '38%', maxHeight: '56%', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, paddingTop: 10, paddingHorizontal: 16, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 14 },
  handleWrap: { alignItems: 'center', marginBottom: 10 },
  handle: { width: 46, height: 5, borderRadius: 999 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  sheetTitleWrap: { flex: 1, gap: 2 },
  sheetEyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  sheetTitle: { fontSize: 21, fontWeight: '800' },
  closeButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sheetScroll: { flex: 1 },
  sheetContent: { gap: 12, paddingBottom: 8 },
  card: { borderRadius: 20, borderWidth: 1, padding: 14, gap: 12 },
  selectedTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { minHeight: 32, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  blockTitle: { fontSize: 15, fontWeight: '800' },
  blockCaption: { fontSize: 13, lineHeight: 19 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 14, fontWeight: '800' },
  ratingMeta: { fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  primaryAction: { minHeight: 40, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { fontSize: 13, fontWeight: '800' },
  secondaryAction: { minHeight: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { fontSize: 13, fontWeight: '700' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewCard: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  reviewAuthor: { fontSize: 13, fontWeight: '800' },
  reviewStars: { fontSize: 12, fontWeight: '800' },
  reviewBody: { fontSize: 13, lineHeight: 19 },
  reviewComposer: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  composerRow: { flexDirection: 'row', gap: 8 },
  ratingInput: { width: 58, minHeight: 42, borderRadius: 12, borderWidth: 1, textAlign: 'center' },
  reviewInput: { flex: 1, minHeight: 42, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12 },
  primaryButton: { minHeight: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  listWrap: { gap: 10 },
  statRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, gap: 4 },
  statLabel: { fontSize: 11, fontWeight: '700' },
  statValue: { fontSize: 20, fontWeight: '800' },
  statSmall: { fontSize: 12, fontWeight: '700' },
  listItem: { minHeight: 68, borderRadius: 16, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listIcon: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  listBody: { flex: 1, gap: 2 },
  listTitle: { fontSize: 14, fontWeight: '800' },
  listMeta: { fontSize: 12, lineHeight: 18 },
  listDistance: { fontSize: 12, fontWeight: '700' },
  attribution: { fontSize: 11, textAlign: 'center' },
});

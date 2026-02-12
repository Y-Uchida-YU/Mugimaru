import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
import { formatMessage, getAppText } from '@/lib/i18n';
import { hasSupabaseEnv } from '@/lib/supabase';

type FilterType = 'all' | SpotType;

type Tile = {
  key: string;
  x: number;
  y: number;
  left: number;
  top: number;
  url: string;
};

const TILE_SIZE = 256;
const ZOOM = 12;
const MAP_WIDTH = 360;
const MAP_HEIGHT = 260;
const CENTER_LAT = 35.6812;
const CENTER_LNG = 139.7671;

function worldPixelFromLatLng(latitude: number, longitude: number) {
  const scale = TILE_SIZE * 2 ** ZOOM;
  const x = ((longitude + 180) / 360) * scale;

  const sinLat = Math.sin((latitude * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;

  return { x, y };
}

function wrapTileX(tileX: number) {
  const max = 2 ** ZOOM;
  return ((tileX % max) + max) % max;
}

function buildVisibleTiles(centerLat: number, centerLng: number): Tile[] {
  const centerPx = worldPixelFromLatLng(centerLat, centerLng);
  const centerTileX = Math.floor(centerPx.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPx.y / TILE_SIZE);

  const tiles: Tile[] = [];
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const tileX = centerTileX + dx;
      const tileY = centerTileY + dy;
      const wrappedX = wrapTileX(tileX);
      const maxY = 2 ** ZOOM;
      if (tileY < 0 || tileY >= maxY) continue;

      const left = tileX * TILE_SIZE - (centerPx.x - MAP_WIDTH / 2);
      const top = tileY * TILE_SIZE - (centerPx.y - MAP_HEIGHT / 2);
      const url = `https://tile.openstreetmap.org/${ZOOM}/${wrappedX}/${tileY}.png`;

      tiles.push({
        key: `${wrappedX}:${tileY}`,
        x: wrappedX,
        y: tileY,
        left,
        top,
        url,
      });
    }
  }

  return tiles;
}

function isFiniteNumber(value: number) {
  return Number.isFinite(value) && !Number.isNaN(value);
}

export default function MapScreen() {
  const text = getAppText();
  const { profile } = useAuth();
  const isGuest = profile?.provider === 'guest';

  const [spots, setSpots] = useState<Spot[]>([]);
  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [spotName, setSpotName] = useState('');
  const [spotType, setSpotType] = useState<SpotType>('dogrun');
  const [latText, setLatText] = useState('35.68');
  const [lngText, setLngText] = useState('139.76');

  const [ratingText, setRatingText] = useState('5');
  const [comment, setComment] = useState('');

  const centerPx = useMemo(() => worldPixelFromLatLng(CENTER_LAT, CENTER_LNG), []);
  const visibleTiles = useMemo(() => buildVisibleTiles(CENTER_LAT, CENTER_LNG), []);

  const visibleSpots = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    return spots.filter((spot) => {
      if (filterType !== 'all' && spot.type !== filterType) {
        return false;
      }
      if (q && !spot.name.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [filterType, searchKeyword, spots]);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedSpotId) ?? null,
    [selectedSpotId, spots]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!hasSupabaseEnv) {
        if (!active) return;
        setMessage(text.map.envMissing);
        return;
      }

      try {
        setLoading(true);
        const rows = await listSpots();
        if (!active) return;
        setSpots(rows);
        setMessage('Connected to Supabase + OpenStreetMap tiles.');
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : text.map.failedLoadSpots);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [text]);

  useEffect(() => {
    if (!selectedSpotId || !hasSupabaseEnv) {
      setReviews([]);
      return;
    }

    let active = true;
    const loadReviews = async () => {
      try {
        const rows = await listReviews(selectedSpotId);
        if (!active) return;
        setReviews(rows);
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : text.map.failedLoadReviews);
      }
    };

    loadReviews();
    return () => {
      active = false;
    };
  }, [selectedSpotId, text]);

  const handleAddSpot = async () => {
    if (isGuest) {
      setMessage('Guest users cannot add spots.');
      return;
    }

    const latitude = Number(latText);
    const longitude = Number(lngText);

    if (!spotName.trim() || !isFiniteNumber(latitude) || !isFiniteNumber(longitude)) {
      setMessage(text.map.spotRequired);
      return;
    }

    const payload = {
      name: spotName.trim(),
      type: spotType,
      latitude,
      longitude,
      created_by_external_id: profile?.externalId ?? null,
      created_by_name: profile?.name ?? null,
    };

    if (!hasSupabaseEnv) {
      setMessage(text.map.addedLocalSpot);
      return;
    }

    try {
      setLoading(true);
      const created = await createSpot(payload);
      setSpots((prev) => [created, ...prev]);
      setSpotName('');
      setMessage(text.map.savedSpot);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.map.failedSaveSpot);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (isGuest) {
      setMessage('Guest users cannot post reviews.');
      return;
    }

    if (!selectedSpotId) {
      setMessage(text.map.selectSpotFirst);
      return;
    }

    const rating = Number(ratingText);
    if (!comment.trim() || Number.isNaN(rating)) {
      setMessage(text.map.reviewRequired);
      return;
    }

    const safeRating = Math.min(5, Math.max(1, rating));
    const payload = {
      spot_id: selectedSpotId,
      author_external_id: profile?.externalId ?? null,
      author_name: profile?.name || text.board.anonymous,
      rating: safeRating,
      comment: comment.trim(),
    };

    if (!hasSupabaseEnv) {
      setMessage(text.map.addedLocalReview);
      return;
    }

    try {
      const created = await createReview(payload);
      setReviews((prev) => [created, ...prev]);
      setComment('');
      setMessage(text.map.savedReview);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.map.failedSaveReview);
    }
  };

  const getPinPosition = (spot: Spot) => {
    const p = worldPixelFromLatLng(spot.latitude, spot.longitude);
    return {
      left: p.x - (centerPx.x - MAP_WIDTH / 2),
      top: p.y - (centerPx.y - MAP_HEIGHT / 2),
    };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{text.map.title}</Text>
          <Text style={styles.caption}>{text.map.caption}</Text>
          <Text style={styles.note}>Map tiles: OpenStreetMap (free)</Text>
          {isGuest ? <Text style={styles.guestNote}>Guest mode: posting is disabled.</Text> : null}
          <Text style={styles.message}>{loading ? text.map.loading : message}</Text>
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, filterType === 'all' ? styles.filterChipActive : null]}
            onPress={() => setFilterType('all')}>
            <Text style={styles.filterChipText}>All</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, filterType === 'dogrun' ? styles.filterChipActive : null]}
            onPress={() => setFilterType('dogrun')}>
            <Text style={styles.filterChipText}>Dog Run</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, filterType === 'vet' ? styles.filterChipActive : null]}
            onPress={() => setFilterType('vet')}>
            <Text style={styles.filterChipText}>Vet</Text>
          </Pressable>
          <Pressable
            style={[styles.filterChip, filterType === 'cafe' ? styles.filterChipActive : null]}
            onPress={() => setFilterType('cafe')}>
            <Text style={styles.filterChipText}>Cafe</Text>
          </Pressable>
        </View>

        <TextInput
          style={styles.input}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          placeholder="Search by spot name"
        />

        <View style={styles.mapWrap}>
          {visibleTiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={[styles.tileImage, { left: tile.left, top: tile.top }]}
            />
          ))}

          {visibleSpots.map((spot) => {
            const { left, top } = getPinPosition(spot);
            const active = selectedSpotId === spot.id;
            return (
              <Pressable
                key={spot.id}
                style={[styles.pinWrap, { left, top }]}
                onPress={() => setSelectedSpotId(spot.id)}>
                <View
                  style={[
                    styles.pin,
                    spot.type === 'dogrun'
                      ? styles.pinDogrun
                      : spot.type === 'vet'
                        ? styles.pinVet
                        : styles.pinCafe,
                    active ? styles.pinActive : null,
                  ]}
                />
              </Pressable>
            );
          })}

          {visibleSpots.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No spots match this filter.</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.attribution}>・ゑｽｩ OpenStreetMap contributors</Text>

        <View style={styles.formCard}>
          <Text style={styles.blockTitle}>{text.map.addSpotTitle}</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.typeButton, spotType === 'dogrun' ? styles.typeButtonActive : null]}
              onPress={() => setSpotType('dogrun')}>
              <Text style={styles.typeText}>Dog Run</Text>
            </Pressable>
            <Pressable
              style={[styles.typeButton, spotType === 'vet' ? styles.typeButtonActive : null]}
              onPress={() => setSpotType('vet')}>
              <Text style={styles.typeText}>Vet</Text>
            </Pressable>
            <Pressable
              style={[styles.typeButton, spotType === 'cafe' ? styles.typeButtonActive : null]}
              onPress={() => setSpotType('cafe')}>
              <Text style={styles.typeText}>Cafe</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.input}
            value={spotName}
            onChangeText={setSpotName}
            placeholder={text.map.spotNamePlaceholder}
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.half]}
              value={latText}
              onChangeText={setLatText}
              placeholder={text.map.latitudePlaceholder}
            />
            <TextInput
              style={[styles.input, styles.half]}
              value={lngText}
              onChangeText={setLngText}
              placeholder={text.map.longitudePlaceholder}
            />
          </View>
          <Pressable
            style={[styles.actionButton, isGuest ? styles.actionButtonDisabled : null]}
            onPress={() => void handleAddSpot()}>
            <Text style={styles.actionText}>{text.map.saveSpotAction}</Text>
          </Pressable>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.blockTitle}>
            {selectedSpot
              ? formatMessage(text.map.reviewsFor, { name: selectedSpot.name })
              : text.map.reviewsTitle}
          </Text>

          <View style={styles.readonlyBox}>
            <Text style={styles.readonlyText}>Author: {profile?.name || text.board.anonymous}</Text>
          </View>

          <TextInput
            style={styles.input}
            value={ratingText}
            onChangeText={setRatingText}
            placeholder={text.map.ratingPlaceholder}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            value={comment}
            onChangeText={setComment}
            placeholder={text.map.reviewPlaceholder}
            multiline
            textAlignVertical="top"
          />
          <Pressable
            style={[styles.actionButton, isGuest ? styles.actionButtonDisabled : null]}
            onPress={() => void handleAddReview()}>
            <Text style={styles.actionText}>{text.map.saveReviewAction}</Text>
          </Pressable>
          {reviews.map((review) => (
            <View key={review.id} style={styles.reviewItem}>
              <Text style={styles.reviewTitle}>
                {formatMessage(text.map.reviewLine, { author: review.author_name, rating: review.rating })}
              </Text>
              <Text style={styles.reviewBody}>{review.comment}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6efe3' },
  content: { padding: 12, gap: 10, paddingBottom: 24 },
  header: { padding: 6 },
  title: { color: '#4a3828', fontSize: 24, fontWeight: '800' },
  caption: { color: '#7e674d', fontSize: 13, marginTop: 2 },
  note: { color: '#8f785e', fontSize: 12, marginTop: 3 },
  guestNote: { color: '#8a6742', fontSize: 12, marginTop: 3 },
  message: { color: '#6f583f', fontSize: 12, marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d8c8af',
    backgroundColor: '#f5ece0',
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  filterChipActive: {
    borderColor: '#b59772',
    backgroundColor: '#ecdfce',
  },
  filterChipText: {
    color: '#6d563d',
    fontWeight: '700',
    fontSize: 12,
  },
  mapWrap: {
    height: MAP_HEIGHT,
    width: MAP_WIDTH,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddccb5',
    backgroundColor: '#efe4d4',
    position: 'relative',
    alignSelf: 'center',
  },
  tileImage: {
    position: 'absolute',
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  pinWrap: {
    position: 'absolute',
    width: 14,
    height: 14,
    marginTop: -7,
    marginLeft: -7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  pinDogrun: { backgroundColor: '#9b7a50' },
  pinVet: { backgroundColor: '#8a6b47' },
  pinCafe: { backgroundColor: '#c39a6d' },
  pinActive: { width: 14, height: 14 },
  emptyWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6c553c',
    fontSize: 14,
    fontWeight: '700',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  attribution: {
    color: '#90785b',
    fontSize: 11,
    textAlign: 'right',
    marginTop: -2,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dac9b2',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  blockTitle: { color: '#4a3828', fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeButton: {
    backgroundColor: '#f4ebdf',
    borderColor: '#ddccb5',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  typeButtonActive: { backgroundColor: '#ede2d2', borderColor: '#bfa482' },
  typeText: { color: '#6d563d', fontWeight: '600' },
  input: {
    backgroundColor: '#fff9f1',
    borderColor: '#dac9b2',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  half: { flex: 1, minWidth: 120 },
  textArea: { minHeight: 86 },
  actionButton: {
    backgroundColor: '#b39169',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonDisabled: {
    backgroundColor: '#c7b59b',
  },
  actionText: { color: '#ffffff', fontWeight: '700' },
  readonlyBox: {
    borderWidth: 1,
    borderColor: '#dac9b2',
    borderRadius: 10,
    backgroundColor: '#f8f1e7',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  readonlyText: {
    color: '#745d43',
    fontSize: 13,
  },
  reviewItem: {
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: '#e5d7c2',
    paddingTop: 8,
  },
  reviewTitle: { color: '#5d4731', fontWeight: '700', fontSize: 13 },
  reviewBody: { color: '#7e674d', fontSize: 13, marginTop: 2 },
});


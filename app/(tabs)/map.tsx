import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
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
import { useAppTheme } from '@/lib/app-theme-context';
import { formatMessage, getAppText } from '@/lib/i18n';
import { hasSupabaseEnv } from '@/lib/supabase';

type FilterType = 'all' | SpotType;

type Tile = {
  key: string;
  left: number;
  top: number;
  url: string;
};

type ProjectedSpot = {
  spot: Spot;
  left: number;
  top: number;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 4;
const MAX_ZOOM = 17;
const DEFAULT_ZOOM = 6;
const DEFAULT_CENTER_LAT = 36.2048;
const DEFAULT_CENTER_LNG = 138.2529;
const MERCATOR_MAX_LAT = 85.05112878;

const TYPE_LABEL: Record<SpotType, string> = {
  dogrun: 'Dog Run',
  shop: 'Pet Shop',
  vet: 'Vet',
  cafe: 'Dog-Friendly Cafe',
};

function clampLatitude(latitude: number) {
  return Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, latitude));
}

function normalizeLongitude(longitude: number) {
  let value = longitude;
  while (value < -180) value += 360;
  while (value > 180) value -= 360;
  return value;
}

function worldPixelFromLatLng(latitude: number, longitude: number, zoom: number) {
  const safeLat = clampLatitude(latitude);
  const scale = TILE_SIZE * 2 ** zoom;
  const x = ((normalizeLongitude(longitude) + 180) / 360) * scale;

  const sinLat = Math.sin((safeLat * Math.PI) / 180);
  const y =
    (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale;

  return { x, y };
}

function latLngFromWorldPixel(x: number, y: number, zoom: number) {
  const scale = TILE_SIZE * 2 ** zoom;
  const longitude = (x / scale) * 360 - 180;

  const n = Math.PI - (2 * Math.PI * y) / scale;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));

  return {
    latitude: clampLatitude(latitude),
    longitude: normalizeLongitude(longitude),
  };
}

function wrapTileX(tileX: number, zoom: number) {
  const max = 2 ** zoom;
  return ((tileX % max) + max) % max;
}

function buildVisibleTiles(
  centerLat: number,
  centerLng: number,
  zoom: number,
  mapWidth: number,
  mapHeight: number
): Tile[] {
  const centerPx = worldPixelFromLatLng(centerLat, centerLng, zoom);
  const centerTileX = Math.floor(centerPx.x / TILE_SIZE);
  const centerTileY = Math.floor(centerPx.y / TILE_SIZE);

  const rangeX = Math.ceil(mapWidth / TILE_SIZE / 2) + 1;
  const rangeY = Math.ceil(mapHeight / TILE_SIZE / 2) + 1;

  const tiles: Tile[] = [];
  for (let dy = -rangeY; dy <= rangeY; dy += 1) {
    for (let dx = -rangeX; dx <= rangeX; dx += 1) {
      const tileX = centerTileX + dx;
      const tileY = centerTileY + dy;
      const wrappedX = wrapTileX(tileX, zoom);
      const maxY = 2 ** zoom;
      if (tileY < 0 || tileY >= maxY) continue;

      const left = tileX * TILE_SIZE - (centerPx.x - mapWidth / 2);
      const top = tileY * TILE_SIZE - (centerPx.y - mapHeight / 2);
      const url = `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`;

      tiles.push({
        key: `${zoom}:${tileX}:${tileY}`,
        left,
        top,
        url,
      });
    }
  }

  return tiles;
}

function formatCoord(value: number) {
  return value.toFixed(5);
}

function buildGoogleMapUrl(spot: Spot) {
  return `https://www.google.com/maps/search/?api=1&query=${spot.latitude},${spot.longitude}`;
}

function buildAppleMapUrl(spot: Spot) {
  return `http://maps.apple.com/?ll=${spot.latitude},${spot.longitude}&q=${encodeURIComponent(spot.name)}`;
}

function getSpotPinStyle(type: SpotType) {
  if (type === 'dogrun') return styles.pinDogrun;
  if (type === 'vet') return styles.pinVet;
  if (type === 'shop') return styles.pinShop;
  return styles.pinCafe;
}

function ratingStars(rating: number) {
  const safe = Math.min(5, Math.max(1, Math.round(rating)));
  return `${'★'.repeat(safe)}${'☆'.repeat(5 - safe)}`;
}

export default function MapScreen() {
  const text = getAppText();
  const { activeTheme } = useAppTheme();
  const themeColors = activeTheme.colors;
  const { width: viewportWidth } = useWindowDimensions();
  const { profile } = useAuth();
  const isGuest = profile?.provider === 'guest';

  const mapWidth = Math.max(320, Math.min(940, viewportWidth - 24));
  const mapHeight = Math.max(280, Math.min(520, mapWidth * 0.66));

  const [spots, setSpots] = useState<Spot[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const [selectedSpotId, setSelectedSpotId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [centerLat, setCenterLat] = useState(DEFAULT_CENTER_LAT);
  const [centerLng, setCenterLng] = useState(DEFAULT_CENTER_LNG);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const [spotName, setSpotName] = useState('');
  const [spotAddress, setSpotAddress] = useState('');
  const [spotType, setSpotType] = useState<SpotType>('dogrun');

  const [ratingText, setRatingText] = useState('5');
  const [comment, setComment] = useState('');

  const centerPx = useMemo(
    () => worldPixelFromLatLng(centerLat, centerLng, zoom),
    [centerLat, centerLng, zoom]
  );

  const visibleTiles = useMemo(
    () => buildVisibleTiles(centerLat, centerLng, zoom, mapWidth, mapHeight),
    [centerLat, centerLng, zoom, mapWidth, mapHeight]
  );

  const filteredSpots = useMemo(() => {
    const q = searchKeyword.trim().toLowerCase();
    return spots.filter((spot) => {
      if (filterType !== 'all' && spot.type !== filterType) return false;

      if (
        q &&
        ![
          spot.name,
          spot.address ?? '',
          spot.created_by_name ?? '',
          TYPE_LABEL[spot.type],
        ]
          .join(' ')
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }

      return true;
    });
  }, [filterType, searchKeyword, spots]);

  const markerSpots = useMemo(() => {
    const projected: ProjectedSpot[] = [];
    for (const spot of filteredSpots) {
      const p = worldPixelFromLatLng(spot.latitude, spot.longitude, zoom);
      const left = p.x - (centerPx.x - mapWidth / 2);
      const top = p.y - (centerPx.y - mapHeight / 2);

      if (left < -20 || left > mapWidth + 20 || top < -20 || top > mapHeight + 20) {
        continue;
      }

      projected.push({ spot, left, top });
      if (projected.length >= 1200) break;
    }

    return projected;
  }, [centerPx.x, centerPx.y, filteredSpots, mapHeight, mapWidth, zoom]);

  const selectedSpot = useMemo(
    () => spots.find((spot) => spot.id === selectedSpotId) ?? null,
    [selectedSpotId, spots]
  );

  useEffect(() => {
    let active = true;

    const loadSpots = async () => {
      if (!hasSupabaseEnv) {
        if (active) {
          setMessage(text.map.envMissing);
        }
        return;
      }

      try {
        setLoading(true);
        const rows = await listSpots();
        if (!active) return;
        setSpots(rows);
        setMessage('Spots loaded from Supabase.');
      } catch (error) {
        if (!active) return;
        setMessage(error instanceof Error ? error.message : text.map.failedLoadSpots);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadSpots();
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

    void loadReviews();
    return () => {
      active = false;
    };
  }, [selectedSpotId, text]);

  const moveMapByPixels = (deltaX: number, deltaY: number) => {
    const nextX = centerPx.x + deltaX;
    const nextY = centerPx.y + deltaY;
    const next = latLngFromWorldPixel(nextX, nextY, zoom);
    setCenterLat(next.latitude);
    setCenterLng(next.longitude);
  };

  const handleZoom = (delta: number) => {
    setZoom((current) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, current + delta));
      return next;
    });
  };

  const handleSelectSpot = (spot: Spot) => {
    setSelectedSpotId(spot.id);
    setCenterLat(spot.latitude);
    setCenterLng(spot.longitude);
  };

  const handleOpenMap = async (target: 'google' | 'apple' | 'default') => {
    if (!selectedSpot) {
      setMessage(text.map.selectSpotFirst);
      return;
    }

    const googleUrl = buildGoogleMapUrl(selectedSpot);
    const appleUrl = buildAppleMapUrl(selectedSpot);

    const open = async (url: string) => {
      try {
        await Linking.openURL(url);
        return true;
      } catch {
        return false;
      }
    };

    if (target === 'google') {
      const ok = await open(googleUrl);
      if (!ok) setMessage('Unable to open Google Maps.');
      return;
    }

    if (target === 'apple') {
      const ok = await open(appleUrl);
      if (!ok) setMessage('Unable to open Apple Maps.');
      return;
    }

    const defaultUrl = Platform.OS === 'ios' ? appleUrl : googleUrl;
    const ok = await open(defaultUrl);
    if (!ok) setMessage('Unable to open map application.');
  };

  const handleResetMap = () => {
    setCenterLat(DEFAULT_CENTER_LAT);
    setCenterLng(DEFAULT_CENTER_LNG);
    setZoom(DEFAULT_ZOOM);
  };

  const handleAddSpot = async () => {
    if (isGuest) {
      setMessage('Guest users cannot add spots.');
      return;
    }

    if (!spotName.trim()) {
      setMessage(text.map.spotRequired);
      return;
    }

    const payload = {
      name: spotName.trim(),
      type: spotType,
      latitude: centerLat,
      longitude: centerLng,
      address: spotAddress.trim() || null,
      source: 'user',
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
      setSelectedSpotId(created.id);
      setSpotName('');
      setSpotAddress('');
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

    const safeRating = Math.min(5, Math.max(1, Math.round(rating)));
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
      setRatingText('5');
      setMessage(text.map.savedReview);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : text.map.failedSaveReview);
    }
  };

  const centerLabel = `${formatCoord(centerLat)}, ${formatCoord(centerLng)} (z${zoom})`;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: themeColors.text }]}>{text.map.title}</Text>
          <Text style={[styles.caption, { color: themeColors.mutedText }]}>{text.map.caption}</Text>
          <Text style={[styles.note, { color: themeColors.mutedText }]}>Map data source: OpenStreetMap</Text>
          <Text style={[styles.message, { color: themeColors.mutedText }]}>{loading ? text.map.loading : message}</Text>
          {isGuest ? <Text style={[styles.guestNote, { color: themeColors.mutedText }]}>Guest mode: posting and comments are disabled.</Text> : null}
        </View>

        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: themeColors.surface,
              borderColor: themeColors.border,
              color: themeColors.text,
            },
          ]}
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          placeholder="Search spots, address, category"
          placeholderTextColor={themeColors.mutedText}
        />

        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterChip,
              {
                borderColor: themeColors.border,
                backgroundColor: themeColors.chip,
              },
              filterType === 'all'
                ? [styles.filterChipActive, { borderColor: themeColors.accent, backgroundColor: themeColors.accent }]
                : null,
            ]}
            onPress={() => setFilterType('all')}>
            <Text style={[styles.filterChipText, { color: filterType === 'all' ? themeColors.accentContrast : themeColors.chipText }]}>All</Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              {
                borderColor: themeColors.border,
                backgroundColor: themeColors.chip,
              },
              filterType === 'dogrun'
                ? [styles.filterChipActive, { borderColor: themeColors.accent, backgroundColor: themeColors.accent }]
                : null,
            ]}
            onPress={() => setFilterType('dogrun')}>
            <Text
              style={[styles.filterChipText, { color: filterType === 'dogrun' ? themeColors.accentContrast : themeColors.chipText }]}>
              Dog Run
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              {
                borderColor: themeColors.border,
                backgroundColor: themeColors.chip,
              },
              filterType === 'shop'
                ? [styles.filterChipActive, { borderColor: themeColors.accent, backgroundColor: themeColors.accent }]
                : null,
            ]}
            onPress={() => setFilterType('shop')}>
            <Text style={[styles.filterChipText, { color: filterType === 'shop' ? themeColors.accentContrast : themeColors.chipText }]}>
              Pet Shop
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              {
                borderColor: themeColors.border,
                backgroundColor: themeColors.chip,
              },
              filterType === 'vet'
                ? [styles.filterChipActive, { borderColor: themeColors.accent, backgroundColor: themeColors.accent }]
                : null,
            ]}
            onPress={() => setFilterType('vet')}>
            <Text style={[styles.filterChipText, { color: filterType === 'vet' ? themeColors.accentContrast : themeColors.chipText }]}>
              Vet
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterChip,
              {
                borderColor: themeColors.border,
                backgroundColor: themeColors.chip,
              },
              filterType === 'cafe'
                ? [styles.filterChipActive, { borderColor: themeColors.accent, backgroundColor: themeColors.accent }]
                : null,
            ]}
            onPress={() => setFilterType('cafe')}>
            <Text style={[styles.filterChipText, { color: filterType === 'cafe' ? themeColors.accentContrast : themeColors.chipText }]}>
              Cafe
            </Text>
          </Pressable>
        </View>

        <View style={styles.toolbarRow}>
          <Pressable
            style={[styles.controlBtn, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
            onPress={() => handleZoom(1)}>
            <Text style={[styles.controlBtnText, { color: themeColors.text }]}>+</Text>
          </Pressable>
          <Pressable
            style={[styles.controlBtn, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
            onPress={() => handleZoom(-1)}>
            <Text style={[styles.controlBtnText, { color: themeColors.text }]}>-</Text>
          </Pressable>
          <Pressable
            style={[styles.controlBtn, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
            onPress={() => moveMapByPixels(0, -120)}>
            <Text style={[styles.controlBtnText, { color: themeColors.text }]}>↑</Text>
          </Pressable>
          <Pressable
            style={[styles.controlBtn, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
            onPress={() => moveMapByPixels(-120, 0)}>
            <Text style={[styles.controlBtnText, { color: themeColors.text }]}>←</Text>
          </Pressable>
          <Pressable
            style={[styles.controlBtn, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
            onPress={() => moveMapByPixels(120, 0)}>
            <Text style={[styles.controlBtnText, { color: themeColors.text }]}>→</Text>
          </Pressable>
          <Pressable
            style={[styles.controlBtn, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
            onPress={() => moveMapByPixels(0, 120)}>
            <Text style={[styles.controlBtnText, { color: themeColors.text }]}>↓</Text>
          </Pressable>
          <Pressable
            style={[styles.controlBtnWide, { borderColor: themeColors.border, backgroundColor: themeColors.surface }]}
            onPress={handleResetMap}>
            <Text style={[styles.controlBtnText, { color: themeColors.text }]}>Reset</Text>
          </Pressable>
        </View>

        <Text style={[styles.centerText, { color: themeColors.mutedText }]}>Center: {centerLabel}</Text>

        <View
          style={[
            styles.mapWrap,
            {
              width: mapWidth,
              height: mapHeight,
              borderColor: themeColors.border,
              backgroundColor: themeColors.elevated,
            },
          ]}>
          {visibleTiles.map((tile) => (
            <Image
              key={tile.key}
              source={{ uri: tile.url }}
              style={[styles.tileImage, { left: tile.left, top: tile.top }]}
            />
          ))}

          {markerSpots.map(({ spot, left, top }) => {
            const active = selectedSpotId === spot.id;
            return (
              <Pressable
                key={spot.id}
                style={[styles.pinWrap, { left, top }]}
                onPress={() => handleSelectSpot(spot)}>
                <View
                  style={[
                    styles.pin,
                    getSpotPinStyle(spot.type),
                    active ? styles.pinActive : null,
                  ]}
                />
              </Pressable>
            );
          })}

          <View style={[styles.centerCrossOuter, { borderColor: themeColors.border }]} pointerEvents="none">
            <View style={[styles.centerCrossInner, { backgroundColor: themeColors.text }]} />
          </View>

          {markerSpots.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No spots in this area/filter.</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.attribution, { color: themeColors.mutedText }]}>© OpenStreetMap contributors</Text>

        <View style={[styles.formCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.blockTitle, { color: themeColors.text }]}>Add a new place at map center</Text>
          <View style={styles.row}>
            <Pressable
              style={[
                styles.typeButton,
                { backgroundColor: themeColors.chip, borderColor: themeColors.border },
                spotType === 'dogrun'
                  ? [styles.typeButtonActive, { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]
                  : null,
              ]}
              onPress={() => setSpotType('dogrun')}>
              <Text style={[styles.typeText, { color: spotType === 'dogrun' ? themeColors.accentContrast : themeColors.chipText }]}>
                Dog Run
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeButton,
                { backgroundColor: themeColors.chip, borderColor: themeColors.border },
                spotType === 'shop'
                  ? [styles.typeButtonActive, { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]
                  : null,
              ]}
              onPress={() => setSpotType('shop')}>
              <Text style={[styles.typeText, { color: spotType === 'shop' ? themeColors.accentContrast : themeColors.chipText }]}>
                Pet Shop
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeButton,
                { backgroundColor: themeColors.chip, borderColor: themeColors.border },
                spotType === 'vet'
                  ? [styles.typeButtonActive, { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]
                  : null,
              ]}
              onPress={() => setSpotType('vet')}>
              <Text style={[styles.typeText, { color: spotType === 'vet' ? themeColors.accentContrast : themeColors.chipText }]}>
                Vet
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.typeButton,
                { backgroundColor: themeColors.chip, borderColor: themeColors.border },
                spotType === 'cafe'
                  ? [styles.typeButtonActive, { backgroundColor: themeColors.accent, borderColor: themeColors.accent }]
                  : null,
              ]}
              onPress={() => setSpotType('cafe')}>
              <Text style={[styles.typeText, { color: spotType === 'cafe' ? themeColors.accentContrast : themeColors.chipText }]}>
                Cafe
              </Text>
            </Pressable>
          </View>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            value={spotName}
            onChangeText={setSpotName}
            placeholder={text.map.spotNamePlaceholder}
            placeholderTextColor={themeColors.mutedText}
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
                color: themeColors.text,
              },
            ]}
            value={spotAddress}
            onChangeText={setSpotAddress}
            placeholder="Address (optional)"
            placeholderTextColor={themeColors.mutedText}
          />
          <Text style={[styles.centerText, { color: themeColors.mutedText }]}>Pin location: {centerLabel}</Text>
          <Pressable
            style={[
              styles.actionButton,
              { backgroundColor: themeColors.accent },
              isGuest ? styles.actionButtonDisabled : null,
            ]}
            onPress={() => void handleAddSpot()}>
            <Text style={[styles.actionText, { color: themeColors.accentContrast }]}>{text.map.saveSpotAction}</Text>
          </Pressable>
        </View>

        <View style={[styles.formCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.blockTitle, { color: themeColors.text }]}>Map pins</Text>
          {filteredSpots.slice(0, 40).map((spot) => (
            <Pressable key={spot.id} style={styles.spotListItem} onPress={() => handleSelectSpot(spot)}>
              <View style={[styles.spotDot, getSpotPinStyle(spot.type)]} />
              <View style={styles.spotInfoWrap}>
                <Text style={[styles.spotListTitle, { color: themeColors.text }]}>{spot.name}</Text>
                <Text style={[styles.spotListMeta, { color: themeColors.mutedText }]}>{TYPE_LABEL[spot.type]}</Text>
              </View>
            </Pressable>
          ))}
          {filteredSpots.length > 40 ? (
            <Text style={[styles.smallCaption, { color: themeColors.mutedText }]}>
              Showing first 40 / {filteredSpots.length} results.
            </Text>
          ) : null}
        </View>

        <View style={[styles.formCard, { backgroundColor: themeColors.surface, borderColor: themeColors.border }]}>
          <Text style={[styles.blockTitle, { color: themeColors.text }]}>
            {selectedSpot
              ? formatMessage(text.map.reviewsFor, { name: selectedSpot.name })
              : 'Tap a pin to see details'}
          </Text>

          {selectedSpot ? (
            <>
              <Text style={[styles.detailName, { color: themeColors.text }]}>{selectedSpot.name}</Text>
              <Text style={[styles.detailMeta, { color: themeColors.mutedText }]}>{TYPE_LABEL[selectedSpot.type]}</Text>
              {selectedSpot.address ? <Text style={[styles.detailMeta, { color: themeColors.mutedText }]}>{selectedSpot.address}</Text> : null}
              <Text style={[styles.detailMeta, { color: themeColors.mutedText }]}>
                {formatCoord(selectedSpot.latitude)}, {formatCoord(selectedSpot.longitude)}
              </Text>

              <View style={styles.row}>
                <Pressable
                  style={[styles.mapOpenBtn, { backgroundColor: themeColors.chip, borderColor: themeColors.border }]}
                  onPress={() => void handleOpenMap('default')}>
                  <Text style={[styles.mapOpenBtnText, { color: themeColors.chipText }]}>Open Map</Text>
                </Pressable>
                <Pressable
                  style={[styles.mapOpenBtn, { backgroundColor: themeColors.chip, borderColor: themeColors.border }]}
                  onPress={() => void handleOpenMap('google')}>
                  <Text style={[styles.mapOpenBtnText, { color: themeColors.chipText }]}>Google Maps</Text>
                </Pressable>
                {Platform.OS === 'ios' ? (
                  <Pressable
                    style={[styles.mapOpenBtn, { backgroundColor: themeColors.chip, borderColor: themeColors.border }]}
                    onPress={() => void handleOpenMap('apple')}>
                    <Text style={[styles.mapOpenBtnText, { color: themeColors.chipText }]}>Apple Maps</Text>
                  </Pressable>
                ) : null}
              </View>

              <Text style={[styles.smallCaption, { color: themeColors.mutedText }]}>Comments ({reviews.length})</Text>
              {reviews.length === 0 ? <Text style={[styles.emptyComments, { color: themeColors.mutedText }]}>No comments yet.</Text> : null}
              {reviews.map((review) => (
                <View key={review.id} style={styles.reviewItem}>
                  <Text style={[styles.reviewTitle, { color: themeColors.text }]}>
                    {review.author_name} · {ratingStars(review.rating)}
                  </Text>
                  <Text style={[styles.reviewBody, { color: themeColors.mutedText }]}>{review.comment}</Text>
                </View>
              ))}

              <View
                style={[styles.readonlyBox, { borderColor: themeColors.border, backgroundColor: themeColors.background }]}>
                <Text style={[styles.readonlyText, { color: themeColors.mutedText }]}>
                  Author: {profile?.name || text.board.anonymous}
                </Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                value={ratingText}
                onChangeText={setRatingText}
                placeholder={text.map.ratingPlaceholder}
                placeholderTextColor={themeColors.mutedText}
              />
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    backgroundColor: themeColors.background,
                    borderColor: themeColors.border,
                    color: themeColors.text,
                  },
                ]}
                value={comment}
                onChangeText={setComment}
                placeholder={text.map.reviewPlaceholder}
                placeholderTextColor={themeColors.mutedText}
                multiline
                textAlignVertical="top"
              />
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: themeColors.accent },
                  isGuest ? styles.actionButtonDisabled : null,
                ]}
                onPress={() => void handleAddReview()}>
                <Text style={[styles.actionText, { color: themeColors.accentContrast }]}>{text.map.saveReviewAction}</Text>
              </Pressable>
            </>
          ) : (
            <Text style={[styles.emptyComments, { color: themeColors.mutedText }]}>
              Select one pin to load comments and actions.
            </Text>
          )}
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
  input: {
    backgroundColor: '#fff9f1',
    borderColor: '#dac9b2',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  toolbarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlBtn: {
    minWidth: 42,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d5c4ad',
    backgroundColor: '#fffaf4',
    alignItems: 'center',
  },
  controlBtnWide: {
    minWidth: 72,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d5c4ad',
    backgroundColor: '#fffaf4',
    alignItems: 'center',
  },
  controlBtnText: {
    color: '#5f4930',
    fontWeight: '700',
    fontSize: 14,
  },
  centerText: {
    color: '#7e674d',
    fontSize: 12,
    fontWeight: '600',
  },
  mapWrap: {
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
    width: 16,
    height: 16,
    marginTop: -8,
    marginLeft: -8,
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
  pinShop: { backgroundColor: '#ad8756' },
  pinActive: { width: 15, height: 15, borderWidth: 2 },
  centerCrossOuter: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -10,
    marginTop: -10,
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(76, 48, 20, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  centerCrossInner: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#5c4430',
  },
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
  spotListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e5d5',
    paddingBottom: 8,
    marginBottom: 2,
  },
  spotDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fff',
  },
  spotInfoWrap: {
    flex: 1,
  },
  spotListTitle: {
    color: '#4a3828',
    fontWeight: '700',
    fontSize: 13,
  },
  spotListMeta: {
    color: '#7e674d',
    fontSize: 12,
    marginTop: 1,
  },
  smallCaption: {
    color: '#8f785e',
    fontSize: 11,
  },
  detailName: {
    color: '#4a3828',
    fontWeight: '800',
    fontSize: 16,
  },
  detailMeta: {
    color: '#7e674d',
    fontSize: 12,
  },
  mapOpenBtn: {
    backgroundColor: '#f3e8d7',
    borderColor: '#d8c6ab',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mapOpenBtnText: {
    color: '#5f4930',
    fontWeight: '700',
    fontSize: 12,
  },
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
  textArea: { minHeight: 86 },
  reviewItem: {
    marginTop: 2,
    borderTopWidth: 1,
    borderColor: '#e5d7c2',
    paddingTop: 8,
  },
  reviewTitle: { color: '#5d4731', fontWeight: '700', fontSize: 13 },
  reviewBody: { color: '#7e674d', fontSize: 13, marginTop: 2 },
  emptyComments: {
    color: '#7e674d',
    fontSize: 13,
  },
});

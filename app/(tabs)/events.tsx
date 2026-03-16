import { FontAwesome6 } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';

type EventRegion = 'all' | 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kansai' | 'chugoku-shikoku' | 'kyushu-okinawa';
type EventType = 'all' | 'festival' | 'adoption' | 'training' | 'run' | 'market' | 'charity';

type EventItem = {
  id: string;
  title: string;
  region: Exclude<EventRegion, 'all'>;
  type: Exclude<EventType, 'all'>;
  dateLabel: string;
  venue: string;
  description: string;
  url: string;
  source: string;
};

const REGION_FILTERS: { id: EventRegion; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'hokkaido', label: 'Hokkaido' },
  { id: 'tohoku', label: 'Tohoku' },
  { id: 'kanto', label: 'Kanto' },
  { id: 'chubu', label: 'Chubu' },
  { id: 'kansai', label: 'Kansai' },
  { id: 'chugoku-shikoku', label: 'Chugoku/Shikoku' },
  { id: 'kyushu-okinawa', label: 'Kyushu/Okinawa' },
];

const TYPE_FILTERS: { id: EventType; label: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'calendar' },
  { id: 'festival', label: 'Festival', icon: 'party-horn' },
  { id: 'adoption', label: 'Adoption', icon: 'house' },
  { id: 'training', label: 'Training', icon: 'graduation-cap' },
  { id: 'run', label: 'Dog Run', icon: 'dog' },
  { id: 'market', label: 'Market', icon: 'bag-shopping' },
  { id: 'charity', label: 'Charity', icon: 'hand-holding-heart' },
];

const EVENT_ITEMS: EventItem[] = [
  {
    id: 'evt-kanto-festival-1',
    title: 'Tokyo Dog Life Festival 2026',
    region: 'kanto',
    type: 'festival',
    dateLabel: 'Apr 19, 2026',
    venue: 'Yoyogi Park, Tokyo',
    description: 'Food, grooming booths, vet talks, and stage events for dog owners.',
    url: 'https://peatix.com/',
    source: 'Peatix',
  },
  {
    id: 'evt-kansai-run-1',
    title: 'Osaka Night Dog Run Meetup',
    region: 'kansai',
    type: 'run',
    dateLabel: 'Apr 26, 2026',
    venue: 'Expo Commemoration Park, Osaka',
    description: 'Evening meetup focused on safe social runs and leash etiquette.',
    url: 'https://www.eventbrite.com/',
    source: 'Eventbrite',
  },
  {
    id: 'evt-chubu-market-1',
    title: 'Nagoya Dog Goods Market',
    region: 'chubu',
    type: 'market',
    dateLabel: 'May 3, 2026',
    venue: 'Hisaya-odori Park, Nagoya',
    description: 'Curated vendors for premium dog food, apparel, and accessories.',
    url: 'https://www.street-academy.com/',
    source: 'Street Academy',
  },
  {
    id: 'evt-kyushu-adoption-1',
    title: 'Fukuoka Rescue Adoption Day',
    region: 'kyushu-okinawa',
    type: 'adoption',
    dateLabel: 'May 10, 2026',
    venue: 'Maizuru Park, Fukuoka',
    description: 'Shelters and foster groups host meetups for adoption and counseling.',
    url: 'https://www.pet-home.jp/',
    source: 'Pet-home',
  },
  {
    id: 'evt-hokkaido-training-1',
    title: 'Sapporo Puppy Starter Class',
    region: 'hokkaido',
    type: 'training',
    dateLabel: 'May 17, 2026',
    venue: 'Sapporo Community Center',
    description: 'Beginner training class for socialization, recall, and house rules.',
    url: 'https://www.doorkeeper.jp/',
    source: 'Doorkeeper',
  },
  {
    id: 'evt-tohoku-charity-1',
    title: 'Sendai Dog Charity Walk',
    region: 'tohoku',
    type: 'charity',
    dateLabel: 'May 24, 2026',
    venue: 'Nishi Park, Sendai',
    description: 'Charity walk to support regional rescue and treatment funds.',
    url: 'https://moshicom.com/',
    source: 'Moshicom',
  },
  {
    id: 'evt-kanto-training-2',
    title: 'Yokohama Recall Bootcamp',
    region: 'kanto',
    type: 'training',
    dateLabel: 'May 31, 2026',
    venue: 'Yamashita Park, Yokohama',
    description: 'Practical outdoor recall and distraction control workshop.',
    url: 'https://www.coubic.com/',
    source: 'Coubic',
  },
  {
    id: 'evt-kansai-festival-2',
    title: 'Kobe Waterfront Dog Festival',
    region: 'kansai',
    type: 'festival',
    dateLabel: 'Jun 7, 2026',
    venue: 'Meriken Park, Kobe',
    description: 'Photo booths, mini games, and seasonal pet travel information.',
    url: 'https://passmarket.yahoo.co.jp/',
    source: 'PassMarket',
  },
  {
    id: 'evt-chugoku-run-1',
    title: 'Hiroshima Morning Dog Run',
    region: 'chugoku-shikoku',
    type: 'run',
    dateLabel: 'Jun 14, 2026',
    venue: 'Peace Boulevard, Hiroshima',
    description: 'Small-group run and behavior sharing session by local owners.',
    url: 'https://www.meetup.com/',
    source: 'Meetup',
  },
  {
    id: 'evt-kyushu-market-2',
    title: 'Okinawa Pet Weekend Market',
    region: 'kyushu-okinawa',
    type: 'market',
    dateLabel: 'Jun 21, 2026',
    venue: 'Ginowan Seaside Park, Okinawa',
    description: 'Weekend market for tropical-safe pet products and treats.',
    url: 'https://www.instagram.com/',
    source: 'Instagram',
  },
];

const PORTAL_LINKS: { id: string; title: string; url: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
  { id: 'portal-eventbrite', title: 'Eventbrite', url: 'https://www.eventbrite.com/', icon: 'ticket' },
  { id: 'portal-peatix', title: 'Peatix', url: 'https://peatix.com/', icon: 'calendar-days' },
  { id: 'portal-doorkeeper', title: 'Doorkeeper', url: 'https://www.doorkeeper.jp/', icon: 'door-open' },
  { id: 'portal-pet-home', title: 'Pet-home', url: 'https://www.pet-home.jp/', icon: 'paw' },
];

function regionLabel(region: Exclude<EventRegion, 'all'>) {
  const hit = REGION_FILTERS.find((item) => item.id === region);
  return hit?.label ?? region;
}

function typeLabel(type: Exclude<EventType, 'all'>) {
  const hit = TYPE_FILTERS.find((item) => item.id === type);
  return hit?.label ?? type;
}

export default function EventsScreen() {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;

  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<EventRegion>('all');
  const [eventType, setEventType] = useState<EventType>('all');
  const [message, setMessage] = useState('');

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVENT_ITEMS.filter((event) => {
      if (region !== 'all' && event.region !== region) return false;
      if (eventType !== 'all' && event.type !== eventType) return false;
      if (!q) return true;
      return [event.title, event.venue, event.description, regionLabel(event.region), typeLabel(event.type)].join(' ').toLowerCase().includes(q);
    });
  }, [eventType, query, region]);

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
      setMessage('');
    } catch {
      setMessage('Failed to open external site.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>Dog Events</Text>
          <Text style={[styles.heroCaption, { color: colors.mutedText }]}>
            Find dog-friendly events by region and type, then jump to the organizer site.
          </Text>
        </View>

        <View style={[styles.controlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <FontAwesome6 name="magnifying-glass" size={14} color={colors.mutedText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search by keyword, venue, or event name"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>Region</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {REGION_FILTERS.map((item) => {
              const active = item.id === region;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.chip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : colors.background }]}
                  onPress={() => setRegion(item.id)}>
                  <Text style={[styles.chipText, { color: active ? colors.accentContrast : colors.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TYPE_FILTERS.map((item) => {
              const active = item.id === eventType;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.typeChip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : colors.background }]}
                  onPress={() => setEventType(item.id)}>
                  <FontAwesome6 name={item.icon} size={12} color={active ? colors.accentContrast : colors.text} />
                  <Text style={[styles.chipText, { color: active ? colors.accentContrast : colors.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.portalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.portalTitle, { color: colors.text }]}>Event Portals</Text>
          <View style={styles.portalGrid}>
            {PORTAL_LINKS.map((portal) => (
              <Pressable
                key={portal.id}
                style={[styles.portalButton, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => void openLink(portal.url)}>
                <FontAwesome6 name={portal.icon} size={14} color={colors.accent} />
                <Text style={[styles.portalButtonText, { color: colors.text }]}>{portal.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.listHeader}>
            <Text style={[styles.listTitle, { color: colors.text }]}>Event List</Text>
            <Text style={[styles.listMeta, { color: colors.mutedText }]}>{filteredEvents.length} results</Text>
          </View>

          {filteredEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>No events match your current filter.</Text>
          ) : (
            filteredEvents.map((event) => (
              <View key={event.id} style={[styles.eventCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.eventTop}>
                  <Text style={[styles.eventDate, { color: colors.accent }]}>{event.dateLabel}</Text>
                  <Text style={[styles.eventSource, { color: colors.mutedText }]}>{event.source}</Text>
                </View>
                <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                <Text style={[styles.eventMeta, { color: colors.mutedText }]}>{event.venue}</Text>
                <View style={styles.eventTagRow}>
                  <View style={[styles.eventTag, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={[styles.eventTagText, { color: colors.mutedText }]}>{regionLabel(event.region)}</Text>
                  </View>
                  <View style={[styles.eventTag, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Text style={[styles.eventTagText, { color: colors.mutedText }]}>{typeLabel(event.type)}</Text>
                  </View>
                </View>
                <Text style={[styles.eventDescription, { color: colors.text }]}>{event.description}</Text>
                <Pressable style={[styles.linkButton, { backgroundColor: colors.accent }]} onPress={() => void openLink(event.url)}>
                  <Text style={[styles.linkButtonText, { color: colors.accentContrast }]}>Open External Site</Text>
                </Pressable>
              </View>
            ))
          )}
        </View>

        {message ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 30, gap: 12 },
  heroCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 4 },
  heroTitle: { fontSize: 26, fontWeight: '800' },
  heroCaption: { fontSize: 13, lineHeight: 20 },
  controlCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  searchWrap: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  sectionLabel: { fontSize: 12, fontWeight: '700' },
  chipRow: { gap: 8, paddingRight: 6 },
  chip: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  typeChip: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipText: { fontSize: 12, fontWeight: '700' },
  portalCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  portalTitle: { fontSize: 15, fontWeight: '800' },
  portalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portalButton: { minHeight: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  portalButtonText: { fontSize: 13, fontWeight: '700' },
  listCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 17, fontWeight: '800' },
  listMeta: { fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13 },
  eventCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 7 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  eventDate: { fontSize: 12, fontWeight: '800' },
  eventSource: { fontSize: 11, fontWeight: '700' },
  eventTitle: { fontSize: 16, fontWeight: '800' },
  eventMeta: { fontSize: 12 },
  eventTagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  eventTag: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  eventTagText: { fontSize: 11, fontWeight: '700' },
  eventDescription: { fontSize: 13, lineHeight: 20 },
  linkButton: { alignSelf: 'flex-start', borderRadius: 999, minHeight: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  linkButtonText: { fontSize: 12, fontWeight: '800' },
  message: { fontSize: 12 },
});

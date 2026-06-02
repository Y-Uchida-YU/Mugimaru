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
  dateISO: string;
  dateLabel: string;
  venue: string;
  description: string;
  url: string;
  source: string;
};

const REGION_FILTERS: { id: EventRegion; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'hokkaido', label: '北海道' },
  { id: 'tohoku', label: '東北' },
  { id: 'kanto', label: '関東' },
  { id: 'chubu', label: '中部' },
  { id: 'kansai', label: '関西' },
  { id: 'chugoku-shikoku', label: '中国・四国' },
  { id: 'kyushu-okinawa', label: '九州・沖縄' },
];

const TYPE_FILTERS: { id: EventType; label: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
  { id: 'all', label: 'すべて', icon: 'calendar' },
  { id: 'festival', label: 'フェス', icon: 'party-horn' },
  { id: 'adoption', label: '譲渡会', icon: 'house' },
  { id: 'training', label: 'しつけ', icon: 'graduation-cap' },
  { id: 'run', label: 'ドッグラン', icon: 'dog' },
  { id: 'market', label: 'マーケット', icon: 'bag-shopping' },
  { id: 'charity', label: 'チャリティ', icon: 'hand-holding-heart' },
];

const EVENT_ITEMS: EventItem[] = [
  {
    id: 'evt-kanto-festival-1',
    title: '東京ドッグライフフェス 2026',
    region: 'kanto',
    type: 'festival',
    dateISO: '2026-04-19',
    dateLabel: '2026年4月19日',
    venue: '東京都 代々木公園',
    description: 'フード、グルーミング、獣医師相談、ステージ企画を楽しめる犬向けイベントです。',
    url: 'https://peatix.com/',
    source: 'Peatix',
  },
  {
    id: 'evt-kansai-run-1',
    title: '大阪ナイトドッグラン交流会',
    region: 'kansai',
    type: 'run',
    dateISO: '2026-04-26',
    dateLabel: '2026年4月26日',
    venue: '大阪府 万博記念公園',
    description: '夕方以降に安全な交流とリードマナーを学べる少人数の集まりです。',
    url: 'https://www.eventbrite.com/',
    source: 'Eventbrite',
  },
  {
    id: 'evt-chubu-market-1',
    title: '名古屋ドッググッズマーケット',
    region: 'chubu',
    type: 'market',
    dateISO: '2026-05-03',
    dateLabel: '2026年5月3日',
    venue: '愛知県 久屋大通公園',
    description: 'ドッグフード、ウェア、ケア用品を扱うショップが集まるマーケットです。',
    url: 'https://www.street-academy.com/',
    source: 'Street Academy',
  },
  {
    id: 'evt-kyushu-adoption-1',
    title: '福岡レスキュー譲渡会',
    region: 'kyushu-okinawa',
    type: 'adoption',
    dateISO: '2026-05-10',
    dateLabel: '2026年5月10日',
    venue: '福岡県 舞鶴公園',
    description: '保護団体と里親希望者が相談できる譲渡会です。',
    url: 'https://www.pet-home.jp/',
    source: 'Pet-home',
  },
  {
    id: 'evt-hokkaido-training-1',
    title: '札幌パピースターター教室',
    region: 'hokkaido',
    type: 'training',
    dateISO: '2026-05-17',
    dateLabel: '2026年5月17日',
    venue: '北海道 札幌市コミュニティセンター',
    description: '社会化、呼び戻し、家庭内ルールを学ぶ初心者向け教室です。',
    url: 'https://www.doorkeeper.jp/',
    source: 'Doorkeeper',
  },
  {
    id: 'evt-tohoku-charity-1',
    title: '仙台ドッグチャリティウォーク',
    region: 'tohoku',
    type: 'charity',
    dateISO: '2026-05-24',
    dateLabel: '2026年5月24日',
    venue: '宮城県 西公園',
    description: '地域の保護活動と治療費支援につながるチャリティウォークです。',
    url: 'https://moshicom.com/',
    source: 'Moshicom',
  },
  {
    id: 'evt-kanto-training-2',
    title: '横浜 呼び戻し実践教室',
    region: 'kanto',
    type: 'training',
    dateISO: '2026-05-31',
    dateLabel: '2026年5月31日',
    venue: '神奈川県 山下公園',
    description: '屋外での呼び戻しと集中力づくりを実践するワークショップです。',
    url: 'https://www.coubic.com/',
    source: 'Coubic',
  },
  {
    id: 'evt-kansai-festival-2',
    title: '神戸ウォーターフロントドッグフェス',
    region: 'kansai',
    type: 'festival',
    dateISO: '2026-06-07',
    dateLabel: '2026年6月7日',
    venue: '兵庫県 メリケンパーク',
    description: 'フォトブース、ミニゲーム、季節の犬連れ旅行情報を楽しめます。',
    url: 'https://passmarket.yahoo.co.jp/',
    source: 'PassMarket',
  },
  {
    id: 'evt-chugoku-run-1',
    title: '広島モーニングドッグラン',
    region: 'chugoku-shikoku',
    type: 'run',
    dateISO: '2026-06-14',
    dateLabel: '2026年6月14日',
    venue: '広島県 平和大通り',
    description: '地域の飼い主同士で走り方や行動の悩みを共有する会です。',
    url: 'https://www.meetup.com/',
    source: 'Meetup',
  },
  {
    id: 'evt-kyushu-market-2',
    title: '沖縄ペット週末マーケット',
    region: 'kyushu-okinawa',
    type: 'market',
    dateISO: '2026-06-21',
    dateLabel: '2026年6月21日',
    venue: '沖縄県 宜野湾海浜公園',
    description: '暑さ対策グッズやおやつを探せる週末マーケットです。',
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function daysUntil(dateISO: string) {
  const eventTime = startOfDay(new Date(`${dateISO}T00:00:00`));
  const todayTime = startOfDay(new Date());
  return Math.round((eventTime - todayTime) / 86400000);
}

function eventTimingLabel(dateISO: string) {
  const diff = daysUntil(dateISO);
  if (diff < 0) return '終了';
  if (diff === 0) return '今日';
  if (diff === 1) return '明日';
  return `${diff}日後`;
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
      return [event.title, event.venue, event.description, regionLabel(event.region), typeLabel(event.type)]
        .join(' ')
        .toLowerCase()
        .includes(q);
    }).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  }, [eventType, query, region]);

  const upcomingEvents = useMemo(
    () => filteredEvents.filter((event) => daysUntil(event.dateISO) >= 0),
    [filteredEvents]
  );

  const featuredEvent = upcomingEvents[0] ?? filteredEvents[0];
  const recommendedEvents = useMemo(() => {
    const preferredTypes: EventType[] = ['festival', 'run', 'market'];
    return EVENT_ITEMS.filter((event) => daysUntil(event.dateISO) >= 0)
      .sort((a, b) => {
        const aTypeIndex = preferredTypes.indexOf(a.type);
        const bTypeIndex = preferredTypes.indexOf(b.type);
        const typeScore =
          (aTypeIndex === -1 ? preferredTypes.length : aTypeIndex) -
          (bTypeIndex === -1 ? preferredTypes.length : bTypeIndex);
        if (typeScore !== 0) return typeScore;
        return a.dateISO.localeCompare(b.dateISO);
      })
      .slice(0, 3);
  }, []);

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
      setMessage('');
    } catch {
      setMessage('外部サイトを開けませんでした。');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.heroCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>犬向けイベント</Text>
              <Text style={[styles.heroCaption, { color: colors.mutedText }]}>
                地域や種類でイベントを探せます。気になるイベントは主催サイトで確認してください。
              </Text>
            </View>
            <View style={[styles.heroCountPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.heroCountValue, { color: colors.text }]}>{upcomingEvents.length}</Text>
              <Text style={[styles.heroCountLabel, { color: colors.mutedText }]}>開催予定</Text>
            </View>
          </View>
          {featuredEvent ? (
            <View style={[styles.featuredStrip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <FontAwesome6 name="calendar-check" size={14} color={colors.accent} />
              <View style={styles.featuredTextWrap}>
                <Text style={[styles.featuredLabel, { color: colors.mutedText }]}>次のイベント</Text>
                <Text style={[styles.featuredTitle, { color: colors.text }]}>{featuredEvent.title}</Text>
              </View>
              <Text style={[styles.featuredDate, { color: colors.accent }]}>{eventTimingLabel(featuredEvent.dateISO)}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.recommendCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.recommendHeader}>
            <View>
              <Text style={[styles.recommendEyebrow, { color: colors.accent }]}>注目イベント</Text>
              <Text style={[styles.recommendTitle, { color: colors.text }]}>今週参加しやすいイベント</Text>
            </View>
            <FontAwesome6 name="star" size={16} color={colors.accent} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendRow}>
            {recommendedEvents.map((event) => (
              <Pressable
                key={`recommended:${event.id}`}
                style={[styles.recommendItem, { backgroundColor: colors.background, borderColor: colors.border }]}
                onPress={() => void openLink(event.url)}>
                <Text style={[styles.recommendDate, { color: colors.accent }]}>{eventTimingLabel(event.dateISO)}</Text>
                <Text style={[styles.recommendItemTitle, { color: colors.text }]} numberOfLines={2}>{event.title}</Text>
                <Text style={[styles.recommendMeta, { color: colors.mutedText }]}>{regionLabel(event.region)} / {typeLabel(event.type)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={[styles.controlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <FontAwesome6 name="magnifying-glass" size={14} color={colors.mutedText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder="キーワード、会場、イベント名で検索"
              placeholderTextColor={colors.mutedText}
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>地域</Text>
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

          <Text style={[styles.sectionLabel, { color: colors.mutedText }]}>種類</Text>
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
          <Text style={[styles.portalTitle, { color: colors.text }]}>イベント掲載サイト</Text>
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
            <View>
              <Text style={[styles.listTitle, { color: colors.text }]}>イベント一覧</Text>
              <Text style={[styles.listSubMeta, { color: colors.mutedText }]}>
                開催予定 {upcomingEvents.length}件 / 全体 {filteredEvents.length}件
              </Text>
            </View>
            <Text style={[styles.listMeta, { color: colors.mutedText }]}>{filteredEvents.length}件</Text>
          </View>

          {filteredEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>条件に一致するイベントはありません。</Text>
          ) : (
            filteredEvents.map((event) => {
              const past = daysUntil(event.dateISO) < 0;
              return (
              <View
                key={event.id}
                style={[
                  styles.eventCard,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  past ? styles.eventCardPast : null,
                ]}>
                <View style={styles.eventTop}>
                  <View style={styles.eventDateWrap}>
                    <Text style={[styles.eventDate, { color: past ? colors.mutedText : colors.accent }]}>{event.dateLabel}</Text>
                    <Text style={[styles.eventTiming, { color: colors.mutedText }]}>{eventTimingLabel(event.dateISO)}</Text>
                  </View>
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
                  <Text style={[styles.linkButtonText, { color: colors.accentContrast }]}>主催サイトを開く</Text>
                </Pressable>
              </View>
            );
            })
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
  heroCard: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  heroTopRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  heroTextWrap: { flex: 1, gap: 4 },
  heroTitle: { fontSize: 26, fontWeight: '800' },
  heroCaption: { fontSize: 13, lineHeight: 20 },
  heroCountPill: { minWidth: 88, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' },
  heroCountValue: { fontSize: 20, fontWeight: '800' },
  heroCountLabel: { fontSize: 11, fontWeight: '700' },
  featuredStrip: { minHeight: 58, borderRadius: 14, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  featuredTextWrap: { flex: 1, gap: 2 },
  featuredLabel: { fontSize: 11, fontWeight: '700' },
  featuredTitle: { fontSize: 13, fontWeight: '800' },
  featuredDate: { fontSize: 12, fontWeight: '800' },
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
  recommendCard: { borderRadius: 18, borderWidth: 1, padding: 12, gap: 10 },
  recommendHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recommendEyebrow: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  recommendTitle: { fontSize: 16, fontWeight: '800' },
  recommendRow: { gap: 10, paddingRight: 6 },
  recommendItem: { width: 210, minHeight: 116, borderRadius: 16, borderWidth: 1, padding: 12, gap: 6 },
  recommendDate: { fontSize: 12, fontWeight: '800' },
  recommendItemTitle: { fontSize: 14, fontWeight: '800', lineHeight: 19 },
  recommendMeta: { fontSize: 11, fontWeight: '700' },
  listCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listTitle: { fontSize: 17, fontWeight: '800' },
  listSubMeta: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  listMeta: { fontSize: 12, fontWeight: '700' },
  emptyText: { fontSize: 13 },
  eventCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 7 },
  eventCardPast: { opacity: 0.62 },
  eventTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  eventDateWrap: { gap: 2 },
  eventDate: { fontSize: 12, fontWeight: '800' },
  eventTiming: { fontSize: 11, fontWeight: '700' },
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

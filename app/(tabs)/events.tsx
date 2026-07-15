import { FontAwesome6 } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { useAuth } from '@/lib/auth-context';
import { getAppText } from '@/lib/i18n';
import { useStoredIdSet } from '@/lib/local-collection';

type EventRegion = 'hokkaido' | 'tohoku' | 'kanto' | 'chubu' | 'kansai' | 'chugoku-shikoku' | 'kyushu-okinawa';
type RegionFilter = 'all' | EventRegion;
type EventType = 'festival' | 'adoption' | 'training' | 'run' | 'market' | 'charity';
type TypeFilter = 'all' | EventType;
type ViewMode = 'discover' | 'nearby' | 'joined';

type EventItem = {
  id: string;
  title: string;
  region: EventRegion;
  type: EventType;
  dateISO: string;
  venue: string;
  description: string;
  url: string;
  source: string;
  baseAttendees: number;
};

const REGION_FILTERS: { id: RegionFilter; label: string }[] = [
  { id: 'all', label: 'すべて' },
  { id: 'hokkaido', label: '北海道' },
  { id: 'tohoku', label: '東北' },
  { id: 'kanto', label: '関東' },
  { id: 'chubu', label: '中部' },
  { id: 'kansai', label: '関西' },
  { id: 'chugoku-shikoku', label: '中国・四国' },
  { id: 'kyushu-okinawa', label: '九州・沖縄' },
];

const TYPE_META: Record<EventType, { label: string; icon: keyof typeof FontAwesome6.glyphMap; tone: string; tint: string }> = {
  festival: { label: 'フェス', icon: 'champagne-glasses', tone: '#fff1ea', tint: '#e66b52' },
  adoption: { label: '譲渡会', icon: 'house-chimney-window', tone: '#ebfbf4', tint: '#2fa878' },
  training: { label: 'しつけ', icon: 'graduation-cap', tone: '#edf6ff', tint: '#2d89d3' },
  run: { label: 'ドッグラン', icon: 'dog', tone: '#fff5e6', tint: '#e0912f' },
  market: { label: 'マーケット', icon: 'bag-shopping', tone: '#f5efff', tint: '#9560d4' },
  charity: { label: 'チャリティ', icon: 'hand-holding-heart', tone: '#ffeef4', tint: '#db4d7f' },
};

const TYPE_FILTERS: { id: TypeFilter; label: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
  { id: 'all', label: 'すべて', icon: 'calendar' },
  ...(Object.keys(TYPE_META) as EventType[]).map((id) => ({ id, label: TYPE_META[id].label, icon: TYPE_META[id].icon })),
];

const PREFECTURE_REGION: { region: EventRegion; keys: string[] }[] = [
  { region: 'hokkaido', keys: ['北海道'] },
  { region: 'tohoku', keys: ['青森', '岩手', '宮城', '秋田', '山形', '福島'] },
  { region: 'kanto', keys: ['茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川'] },
  { region: 'chubu', keys: ['新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知'] },
  { region: 'kansai', keys: ['三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山'] },
  { region: 'chugoku-shikoku', keys: ['鳥取', '島根', '岡山', '広島', '山口', '徳島', '香川', '愛媛', '高知'] },
  { region: 'kyushu-okinawa', keys: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'] },
];

function regionFromPrefecture(prefecture?: string | null): EventRegion | null {
  if (!prefecture) return null;
  for (const entry of PREFECTURE_REGION) {
    if (entry.keys.some((key) => prefecture.includes(key))) return entry.region;
  }
  return null;
}

const EVENT_ITEMS: EventItem[] = [
  { id: 'evt-kanto-festival-1', title: '東京ドッグライフフェス 2026', region: 'kanto', type: 'festival', dateISO: '2026-07-19', venue: '東京都 代々木公園', description: 'フード、グルーミング、獣医師相談、ステージ企画を楽しめる犬向けイベントです。', url: 'https://peatix.com/', source: 'Peatix', baseAttendees: 214 },
  { id: 'evt-kansai-run-1', title: '大阪ナイトドッグラン交流会', region: 'kansai', type: 'run', dateISO: '2026-07-26', venue: '大阪府 万博記念公園', description: '夕方以降に安全な交流とリードマナーを学べる少人数の集まりです。', url: 'https://www.eventbrite.com/', source: 'Eventbrite', baseAttendees: 38 },
  { id: 'evt-chubu-market-1', title: '名古屋ドッググッズマーケット', region: 'chubu', type: 'market', dateISO: '2026-08-02', venue: '愛知県 久屋大通公園', description: 'ドッグフード、ウェア、ケア用品を扱うショップが集まるマーケットです。', url: 'https://www.street-academy.com/', source: 'Street Academy', baseAttendees: 96 },
  { id: 'evt-kyushu-adoption-1', title: '福岡レスキュー譲渡会', region: 'kyushu-okinawa', type: 'adoption', dateISO: '2026-08-09', venue: '福岡県 舞鶴公園', description: '保護団体と里親希望者が相談できる譲渡会です。', url: 'https://www.pet-home.jp/', source: 'Pet-home', baseAttendees: 52 },
  { id: 'evt-hokkaido-training-1', title: '札幌パピースターター教室', region: 'hokkaido', type: 'training', dateISO: '2026-08-16', venue: '北海道 札幌市コミュニティセンター', description: '社会化、呼び戻し、家庭内ルールを学ぶ初心者向け教室です。', url: 'https://www.doorkeeper.jp/', source: 'Doorkeeper', baseAttendees: 24 },
  { id: 'evt-tohoku-charity-1', title: '仙台ドッグチャリティウォーク', region: 'tohoku', type: 'charity', dateISO: '2026-08-23', venue: '宮城県 西公園', description: '地域の保護活動と治療費支援につながるチャリティウォークです。', url: 'https://moshicom.com/', source: 'Moshicom', baseAttendees: 71 },
  { id: 'evt-kanto-training-2', title: '横浜 呼び戻し実践教室', region: 'kanto', type: 'training', dateISO: '2026-08-30', venue: '神奈川県 山下公園', description: '屋外での呼び戻しと集中力づくりを実践するワークショップです。', url: 'https://www.coubic.com/', source: 'Coubic', baseAttendees: 33 },
  { id: 'evt-kansai-festival-2', title: '神戸ウォーターフロントドッグフェス', region: 'kansai', type: 'festival', dateISO: '2026-09-06', venue: '兵庫県 メリケンパーク', description: 'フォトブース、ミニゲーム、季節の犬連れ旅行情報を楽しめます。', url: 'https://passmarket.yahoo.co.jp/', source: 'PassMarket', baseAttendees: 187 },
  { id: 'evt-chugoku-run-1', title: '広島モーニングドッグラン', region: 'chugoku-shikoku', type: 'run', dateISO: '2026-09-13', venue: '広島県 平和大通り', description: '地域の飼い主同士で走り方や行動の悩みを共有する会です。', url: 'https://www.meetup.com/', source: 'Meetup', baseAttendees: 41 },
  { id: 'evt-kyushu-market-2', title: '沖縄ペット週末マーケット', region: 'kyushu-okinawa', type: 'market', dateISO: '2026-09-20', venue: '沖縄県 宜野湾海浜公園', description: '暑さ対策グッズやおやつを探せる週末マーケットです。', url: 'https://www.instagram.com/', source: 'Instagram', baseAttendees: 63 },
  { id: 'evt-kanto-market-3', title: '東京お台場ドッグピクニック', region: 'kanto', type: 'market', dateISO: '2026-07-23', venue: '東京都 お台場海浜公園', description: 'キッチンカーとハンドメイド雑貨が並ぶ、海辺のピクニックイベント。', url: 'https://peatix.com/', source: 'Peatix', baseAttendees: 128 },
  { id: 'evt-chubu-festival-2', title: '静岡ドッグサマーフェスタ', region: 'chubu', type: 'festival', dateISO: '2026-08-11', venue: '静岡県 駿府城公園', description: '水遊びゾーンや小型犬エリアもある夏のファミリー向けフェス。', url: 'https://www.eventbrite.com/', source: 'Eventbrite', baseAttendees: 152 },
];

const REGION_LABEL: Record<EventRegion, string> = {
  hokkaido: '北海道',
  tohoku: '東北',
  kanto: '関東',
  chubu: '中部',
  kansai: '関西',
  'chugoku-shikoku': '中国・四国',
  'kyushu-okinawa': '九州・沖縄',
};

const PORTAL_LINKS: { id: string; title: string; url: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
  { id: 'portal-eventbrite', title: 'Eventbrite', url: 'https://www.eventbrite.com/', icon: 'ticket' },
  { id: 'portal-peatix', title: 'Peatix', url: 'https://peatix.com/', icon: 'calendar-days' },
  { id: 'portal-doorkeeper', title: 'Doorkeeper', url: 'https://www.doorkeeper.jp/', icon: 'door-open' },
  { id: 'portal-pet-home', title: 'Pet-home', url: 'https://www.pet-home.jp/', icon: 'paw' },
];

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

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
  if (diff <= 7) return `${diff}日後`;
  return `${Math.round(diff / 7)}週間後`;
}

function dateParts(dateISO: string) {
  const d = new Date(`${dateISO}T00:00:00`);
  return { month: MONTHS[d.getMonth()], day: d.getDate(), weekday: WEEKDAYS[d.getDay()] };
}

export default function EventsScreen() {
  const { activeTheme } = useAppTheme();
  const colors = activeTheme.colors;
  const { profile } = useAuth();
  const text = getAppText();
  const isJapan = text.localeGroup === 'japan';

  const joined = useStoredIdSet('mugimaru.events.joined');
  const homeRegion = useMemo(() => regionFromPrefecture(profile?.prefecture), [profile?.prefecture]);

  const [query, setQuery] = useState('');
  const [region, setRegion] = useState<RegionFilter>('all');
  const [eventType, setEventType] = useState<TypeFilter>('all');
  const [view, setView] = useState<ViewMode>('discover');
  const [message, setMessage] = useState('');

  const attendeeCount = (event: EventItem) => event.baseAttendees + (joined.has(event.id) ? 1 : 0);

  const baseList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EVENT_ITEMS.filter((event) => {
      if (view === 'joined' && !joined.has(event.id)) return false;
      if (view === 'nearby' && (!homeRegion || event.region !== homeRegion)) return false;
      if (region !== 'all' && event.region !== region) return false;
      if (eventType !== 'all' && event.type !== eventType) return false;
      if (!q) return true;
      return [event.title, event.venue, event.description, REGION_LABEL[event.region], TYPE_META[event.type].label]
        .join(' ')
        .toLowerCase()
        .includes(q);
    }).sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  }, [eventType, query, region, view, joined, homeRegion]);

  const upcomingCount = useMemo(() => baseList.filter((e) => daysUntil(e.dateISO) >= 0).length, [baseList]);
  const joinedCount = joined.ids.size;
  const featured = useMemo(() => baseList.find((e) => daysUntil(e.dateISO) >= 0) ?? baseList[0] ?? null, [baseList]);

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
      setMessage('');
    } catch {
      setMessage('外部サイトを開けませんでした。');
    }
  };

  const VIEWS: { id: ViewMode; label: string; icon: keyof typeof FontAwesome6.glyphMap }[] = [
    { id: 'discover', label: isJapan ? '見つける' : 'Discover', icon: 'compass' },
    { id: 'nearby', label: isJapan ? '近くで' : 'Nearby', icon: 'location-dot' },
    { id: 'joined', label: isJapan ? '参加予定' : 'Going', icon: 'circle-check' },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.accent }]}>
          <View style={styles.heroTop}>
            <FontAwesome6 name="calendar-day" size={16} solid color={colors.accentContrast} />
            <Text style={[styles.heroEyebrow, { color: colors.accentContrast }]}>{isJapan ? 'ドッグイベント' : 'DOG EVENTS'}</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.accentContrast }]}>
            {isJapan ? '愛犬と行けるイベントを見つけよう' : 'Find events to enjoy with your dog'}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: colors.accentContrast }]}>{upcomingCount}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.accentContrast }]}>{isJapan ? '開催予定' : 'upcoming'}</Text>
            </View>
            <View style={[styles.heroDivider, { backgroundColor: colors.accentContrast }]} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: colors.accentContrast }]}>{joinedCount}</Text>
              <Text style={[styles.heroStatLabel, { color: colors.accentContrast }]}>{isJapan ? '参加予定' : 'going'}</Text>
            </View>
          </View>
        </View>

        {/* Segmented view control */}
        <View style={[styles.segment, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {VIEWS.map((item) => {
            const active = item.id === view;
            const disabled = item.id === 'nearby' && !homeRegion;
            return (
              <Pressable
                key={item.id}
                style={[styles.segmentItem, active ? { backgroundColor: colors.accent } : null, disabled ? styles.segmentDisabled : null]}
                onPress={() => (disabled ? setMessage(isJapan ? 'プロフィールで地域を設定すると使えます。' : 'Set your area in profile to use this.') : setView(item.id))}>
                <FontAwesome6 name={item.icon} size={13} solid color={active ? colors.accentContrast : colors.mutedText} />
                <Text style={[styles.segmentText, { color: active ? colors.accentContrast : colors.text }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {view === 'nearby' && homeRegion ? (
          <Text style={[styles.nearbyNote, { color: colors.mutedText }]}>
            {isJapan ? `お住まいの地域「${REGION_LABEL[homeRegion]}」のイベント` : `Events in your area: ${REGION_LABEL[homeRegion]}`}
          </Text>
        ) : null}

        {/* Featured */}
        {featured ? (
          <Pressable style={[styles.featuredCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => void openLink(featured.url)}>
            <View style={[styles.featuredIcon, { backgroundColor: TYPE_META[featured.type].tone }]}>
              <FontAwesome6 name={TYPE_META[featured.type].icon} size={20} solid color={TYPE_META[featured.type].tint} />
            </View>
            <View style={styles.featuredBody}>
              <Text style={[styles.featuredEyebrow, { color: colors.accent }]}>{isJapan ? '次のおすすめ' : 'UP NEXT'}</Text>
              <Text style={[styles.featuredTitle, { color: colors.text }]} numberOfLines={2}>{featured.title}</Text>
              <View style={styles.featuredMetaRow}>
                <FontAwesome6 name="location-dot" size={11} solid color={colors.mutedText} />
                <Text style={[styles.featuredMeta, { color: colors.mutedText }]} numberOfLines={1}>{featured.venue}</Text>
              </View>
            </View>
            <View style={styles.featuredRight}>
              <Text style={[styles.featuredTiming, { color: colors.accent }]}>{eventTimingLabel(featured.dateISO)}</Text>
              <Text style={[styles.featuredAttendees, { color: colors.mutedText }]}>
                <FontAwesome6 name="user" size={9} solid color={colors.mutedText} /> {attendeeCount(featured)}
              </Text>
            </View>
          </Pressable>
        ) : null}

        {/* Search + filters */}
        <View style={[styles.controlCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <FontAwesome6 name="magnifying-glass" size={14} color={colors.mutedText} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              value={query}
              onChangeText={setQuery}
              placeholder={isJapan ? 'キーワード・会場・イベント名' : 'Keyword, venue, event'}
              placeholderTextColor={colors.mutedText}
            />
            {query ? (
              <Pressable hitSlop={8} onPress={() => setQuery('')}>
                <FontAwesome6 name="circle-xmark" size={15} solid color={colors.mutedText} />
              </Pressable>
            ) : null}
          </View>

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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {TYPE_FILTERS.map((item) => {
              const active = item.id === eventType;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.typeChip, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accent : colors.background }]}
                  onPress={() => setEventType(item.id)}>
                  <FontAwesome6 name={item.icon} size={12} solid color={active ? colors.accentContrast : colors.mutedText} />
                  <Text style={[styles.chipText, { color: active ? colors.accentContrast : colors.text }]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Event list */}
        {baseList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <FontAwesome6 name={view === 'joined' ? 'calendar-check' : 'calendar-xmark'} size={26} color={colors.mutedText} />
            <Text style={[styles.emptyText, { color: colors.mutedText }]}>
              {view === 'joined'
                ? isJapan
                  ? '参加予定のイベントはまだありません。'
                  : 'You have not joined any events yet.'
                : isJapan
                ? '条件に一致するイベントはありません。'
                : 'No events match your filters.'}
            </Text>
          </View>
        ) : (
          baseList.map((event) => {
            const past = daysUntil(event.dateISO) < 0;
            const isJoined = joined.has(event.id);
            const dp = dateParts(event.dateISO);
            const meta = TYPE_META[event.type];
            return (
              <View key={event.id} style={[styles.eventCard, { backgroundColor: colors.surface, borderColor: colors.border }, past ? styles.eventCardPast : null]}>
                <View style={styles.eventTop}>
                  <View style={[styles.dateChip, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text style={[styles.dateChipMonth, { color: colors.accent }]}>{dp.month}</Text>
                    <Text style={[styles.dateChipDay, { color: colors.text }]}>{dp.day}</Text>
                    <Text style={[styles.dateChipWeekday, { color: colors.mutedText }]}>{dp.weekday}</Text>
                  </View>
                  <View style={styles.eventHeadBody}>
                    <View style={styles.eventTagRow}>
                      <View style={[styles.eventTypeTag, { backgroundColor: meta.tone }]}>
                        <FontAwesome6 name={meta.icon} size={10} solid color={meta.tint} />
                        <Text style={[styles.eventTypeText, { color: meta.tint }]}>{meta.label}</Text>
                      </View>
                      <View style={[styles.timingTag, { backgroundColor: past ? colors.background : colors.accent }]}>
                        <Text style={[styles.timingText, { color: past ? colors.mutedText : colors.accentContrast }]}>{eventTimingLabel(event.dateISO)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                    <View style={styles.eventMetaRow}>
                      <FontAwesome6 name="location-dot" size={11} solid color={colors.mutedText} />
                      <Text style={[styles.eventMeta, { color: colors.mutedText }]} numberOfLines={1}>{event.venue}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.eventDescription, { color: colors.text }]}>{event.description}</Text>

                <View style={styles.eventFooter}>
                  <View style={styles.attendeeWrap}>
                    <FontAwesome6 name="users" size={12} solid color={colors.mutedText} />
                    <Text style={[styles.attendeeText, { color: colors.mutedText }]}>
                      {isJapan ? `${attendeeCount(event)}人が参加` : `${attendeeCount(event)} going`}
                    </Text>
                  </View>
                  <View style={styles.footerActions}>
                    <Pressable style={[styles.detailBtn, { borderColor: colors.border }]} onPress={() => void openLink(event.url)}>
                      <FontAwesome6 name="arrow-up-right-from-square" size={11} color={colors.text} />
                      <Text style={[styles.detailBtnText, { color: colors.text }]}>{isJapan ? '詳細' : 'Details'}</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.joinBtn, isJoined ? { backgroundColor: colors.background, borderColor: colors.accent, borderWidth: 1 } : { backgroundColor: colors.accent }, past ? styles.disabled : null]}
                      onPress={() => joined.toggle(event.id)}
                      disabled={past}>
                      <FontAwesome6 name={isJoined ? 'circle-check' : 'plus'} size={12} solid color={isJoined ? colors.accent : colors.accentContrast} />
                      <Text style={[styles.joinBtnText, { color: isJoined ? colors.accent : colors.accentContrast }]}>
                        {isJoined ? (isJapan ? '参加予定' : 'Going') : isJapan ? '参加する' : 'Join'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Portal links */}
        <View style={[styles.portalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.portalTitle, { color: colors.text }]}>{isJapan ? 'イベント掲載サイト' : 'Event portals'}</Text>
          <View style={styles.portalGrid}>
            {PORTAL_LINKS.map((portal) => (
              <Pressable key={portal.id} style={[styles.portalButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => void openLink(portal.url)}>
                <FontAwesome6 name={portal.icon} size={14} color={colors.accent} />
                <Text style={[styles.portalButtonText, { color: colors.text }]}>{portal.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {message ? (
          <View style={[styles.toast, { backgroundColor: colors.text }]}>
            <Text style={[styles.toastText, { color: colors.background }]}>{message}</Text>
            <Pressable hitSlop={8} onPress={() => setMessage('')}>
              <FontAwesome6 name="xmark" size={13} color={colors.background} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 32, gap: 12 },
  heroCard: { borderRadius: 22, paddingHorizontal: 18, paddingVertical: 18, gap: 10 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroEyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1, opacity: 0.9 },
  heroTitle: { fontSize: 22, fontWeight: '900', lineHeight: 29 },
  heroStats: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 4 },
  heroStat: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroStatValue: { fontSize: 22, fontWeight: '900' },
  heroStatLabel: { fontSize: 12, fontWeight: '700', opacity: 0.9 },
  heroDivider: { width: 1, height: 22, opacity: 0.35 },
  segment: { flexDirection: 'row', borderRadius: 14, borderWidth: 1, padding: 4, gap: 4 },
  segmentItem: { flex: 1, minHeight: 40, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  segmentDisabled: { opacity: 0.5 },
  segmentText: { fontSize: 13, fontWeight: '800' },
  nearbyNote: { fontSize: 12, fontWeight: '600', marginTop: -4, marginLeft: 4 },
  featuredCard: { borderRadius: 18, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  featuredIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  featuredBody: { flex: 1, gap: 3 },
  featuredEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  featuredTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20 },
  featuredMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  featuredMeta: { fontSize: 12 },
  featuredRight: { alignItems: 'flex-end', gap: 6 },
  featuredTiming: { fontSize: 13, fontWeight: '900' },
  featuredAttendees: { fontSize: 11, fontWeight: '700' },
  controlCard: { borderRadius: 18, borderWidth: 1, padding: 12, gap: 10 },
  searchWrap: { minHeight: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  chipRow: { gap: 8, paddingRight: 6 },
  chip: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  typeChip: { minHeight: 34, borderRadius: 999, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7 },
  chipText: { fontSize: 12, fontWeight: '700' },
  emptyCard: { borderRadius: 18, borderWidth: 1, paddingVertical: 34, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 13, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
  eventCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 11 },
  eventCardPast: { opacity: 0.6 },
  eventTop: { flexDirection: 'row', gap: 12 },
  dateChip: { width: 58, borderRadius: 14, borderWidth: 1, paddingVertical: 8, alignItems: 'center', gap: 1 },
  dateChipMonth: { fontSize: 11, fontWeight: '800' },
  dateChipDay: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  dateChipWeekday: { fontSize: 10, fontWeight: '700' },
  eventHeadBody: { flex: 1, gap: 5 },
  eventTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  eventTypeTag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  eventTypeText: { fontSize: 11, fontWeight: '800' },
  timingTag: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  timingText: { fontSize: 11, fontWeight: '800' },
  eventTitle: { fontSize: 16, fontWeight: '800', lineHeight: 21 },
  eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  eventMeta: { fontSize: 12, flex: 1 },
  eventDescription: { fontSize: 13, lineHeight: 20 },
  eventFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  attendeeWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  attendeeText: { fontSize: 12, fontWeight: '700' },
  footerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailBtn: { minHeight: 38, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailBtnText: { fontSize: 12, fontWeight: '700' },
  joinBtn: { minHeight: 38, borderRadius: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  joinBtnText: { fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  portalCard: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 10, marginTop: 4 },
  portalTitle: { fontSize: 15, fontWeight: '800' },
  portalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portalButton: { minHeight: 40, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  portalButtonText: { fontSize: 13, fontWeight: '700' },
  toast: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  toastText: { flex: 1, fontSize: 13, fontWeight: '600' },
});

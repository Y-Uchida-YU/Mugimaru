import type { LocaleGroup } from '@/lib/i18n';
import { getAppText } from '@/lib/i18n';

export type EventsText = {
  tabLabel: string;
  title: string;
  caption: string;
  selectedDate: string;
  areaLabel: string;
  areaPlaceholder: string;
  searchAction: string;
  todayAction: string;
  clearAreaAction: string;
  quickAreasLabel: string;
  loading: string;
  noResults: string;
  openLink: string;
  openLinkFailed: string;
  sourceLabel: string;
  sourceEventbrite: string;
  sourceSample: string;
  tokenMissingNotice: string;
  apiFailedNotice: string;
  weekdays: string[];
  localeTag: string;
};

const americasText: EventsText = {
  tabLabel: 'Events',
  title: 'Dog Events',
  caption: 'Find dog runs, meetups, and pet-friendly events by date and area.',
  selectedDate: 'Selected date',
  areaLabel: 'Area',
  areaPlaceholder: 'e.g. Tokyo, Osaka, Shibuya',
  searchAction: 'Search events',
  todayAction: 'Today',
  clearAreaAction: 'Clear area',
  quickAreasLabel: 'Quick areas',
  loading: 'Loading events...',
  noResults: 'No events were found for this date and area.',
  openLink: 'Open details',
  openLinkFailed: 'Could not open event URL.',
  sourceLabel: 'Source',
  sourceEventbrite: 'Eventbrite API',
  sourceSample: 'Sample data',
  tokenMissingNotice: 'EXPO_PUBLIC_EVENTBRITE_TOKEN is missing. Showing sample events.',
  apiFailedNotice: 'Failed to fetch Eventbrite events. Showing sample events.',
  weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  localeTag: 'en-US',
};

const europeText: EventsText = {
  ...americasText,
  localeTag: 'en-GB',
};

const chinaText: EventsText = {
  tabLabel: '活动',
  title: '狗狗活动',
  caption: '按日期和地区搜索狗狗乐园、聚会和宠物友好活动。',
  selectedDate: '选择日期',
  areaLabel: '地区',
  areaPlaceholder: '例如：东京、大阪、涩谷',
  searchAction: '搜索活动',
  todayAction: '今天',
  clearAreaAction: '清除地区',
  quickAreasLabel: '快捷地区',
  loading: '正在加载活动...',
  noResults: '该日期和地区暂无活动。',
  openLink: '查看详情',
  openLinkFailed: '无法打开活动链接。',
  sourceLabel: '来源',
  sourceEventbrite: 'Eventbrite API',
  sourceSample: '示例数据',
  tokenMissingNotice: '未设置 EXPO_PUBLIC_EVENTBRITE_TOKEN，当前显示示例活动。',
  apiFailedNotice: '获取 Eventbrite 活动失败，当前显示示例活动。',
  weekdays: ['日', '一', '二', '三', '四', '五', '六'],
  localeTag: 'zh-CN',
};

const koreaText: EventsText = {
  tabLabel: '이벤트',
  title: '강아지 이벤트',
  caption: '날짜와 지역으로 도그런, 모임, 반려동물 이벤트를 검색하세요.',
  selectedDate: '선택한 날짜',
  areaLabel: '지역',
  areaPlaceholder: '예: 도쿄, 오사카, 시부야',
  searchAction: '이벤트 검색',
  todayAction: '오늘',
  clearAreaAction: '지역 초기화',
  quickAreasLabel: '빠른 지역',
  loading: '이벤트를 불러오는 중...',
  noResults: '선택한 날짜와 지역의 이벤트가 없습니다.',
  openLink: '상세 보기',
  openLinkFailed: '이벤트 링크를 열 수 없습니다.',
  sourceLabel: '출처',
  sourceEventbrite: 'Eventbrite API',
  sourceSample: '샘플 데이터',
  tokenMissingNotice: 'EXPO_PUBLIC_EVENTBRITE_TOKEN 미설정으로 샘플 이벤트를 표시합니다.',
  apiFailedNotice: 'Eventbrite 조회에 실패하여 샘플 이벤트를 표시합니다.',
  weekdays: ['일', '월', '화', '수', '목', '금', '토'],
  localeTag: 'ko-KR',
};

const japanText: EventsText = {
  tabLabel: 'イベント',
  title: '犬関連イベント',
  caption: '日付とエリアでドッグラン・交流会・ペット向けイベントを探せます。',
  selectedDate: '選択日',
  areaLabel: 'エリア',
  areaPlaceholder: '例: 東京, 大阪, 渋谷',
  searchAction: 'イベントを検索',
  todayAction: '今日',
  clearAreaAction: 'エリアをクリア',
  quickAreasLabel: 'よく使うエリア',
  loading: 'イベントを読み込み中...',
  noResults: 'この日付・エリアのイベントは見つかりませんでした。',
  openLink: '詳細を開く',
  openLinkFailed: 'イベントURLを開けませんでした。',
  sourceLabel: 'データ元',
  sourceEventbrite: 'Eventbrite API',
  sourceSample: 'サンプルデータ',
  tokenMissingNotice: 'EXPO_PUBLIC_EVENTBRITE_TOKEN 未設定のため、サンプルイベントを表示しています。',
  apiFailedNotice: 'Eventbrite の取得に失敗したため、サンプルイベントを表示しています。',
  weekdays: ['日', '月', '火', '水', '木', '金', '土'],
  localeTag: 'ja-JP',
};

const textMap: Record<LocaleGroup, EventsText> = {
  americas: americasText,
  europe: europeText,
  china: chinaText,
  korea: koreaText,
  japan: japanText,
};

export function getEventsText() {
  const localeGroup = getAppText().localeGroup;
  return textMap[localeGroup];
}

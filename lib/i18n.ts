export type LocaleGroup = 'americas' | 'europe' | 'china' | 'korea' | 'japan';

type TemplateVars = Record<string, number | string>;

type SeedPost = {
  id: string;
  title: string;
  body: string;
  author: string;
  category: string;
  replies: number;
  updatedAt: string;
};

export type AppText = {
  localeGroup: LocaleGroup;
  tabs: {
    board: string;
    map: string;
  };
  board: {
    heroLabel: string;
    heroTitle: string;
    heroCaption: string;
    searchPlaceholder: string;
    categories: string[];
    latestThreads: string;
    itemsCount: string;
    repliesCount: string;
    byAuthor: string;
    composerTitle: string;
    titlePlaceholder: string;
    authorPlaceholder: string;
    bodyPlaceholder: string;
    titleRequired: string;
    bodyRequired: string;
    cancel: string;
    post: string;
    anonymous: string;
    seedPosts: SeedPost[];
  };
  signup: {
    title: string;
    caption: string;
    tabLine: string;
    tabX: string;
    tabEmail: string;
    lineTitle: string;
    lineCaption: string;
    lineAction: string;
    xTitle: string;
    xCaption: string;
    xAction: string;
    emailTitle: string;
    fullNamePlaceholder: string;
    emailPlaceholder: string;
    passwordPlaceholder: string;
    emailAction: string;
    socialConnected: string;
    emailConnected: string;
    nameRequired: string;
    emailInvalid: string;
    passwordTooShort: string;
  };
  map: {
    title: string;
    caption: string;
    note: string;
    loading: string;
    envMissing: string;
    connected: string;
    failedLoadSpots: string;
    failedLoadReviews: string;
    spotRequired: string;
    addedLocalSpot: string;
    savedSpot: string;
    failedSaveSpot: string;
    selectSpotFirst: string;
    reviewRequired: string;
    addedLocalReview: string;
    savedReview: string;
    failedSaveReview: string;
    addSpotTitle: string;
    dogRun: string;
    vetClinic: string;
    spotNamePlaceholder: string;
    latitudePlaceholder: string;
    longitudePlaceholder: string;
    saveSpotAction: string;
    reviewsTitle: string;
    reviewsFor: string;
    authorPlaceholder: string;
    ratingPlaceholder: string;
    reviewPlaceholder: string;
    saveReviewAction: string;
    reviewLine: string;
  };
};

const EUROPE_REGIONS = new Set([
  'AL',
  'AD',
  'AT',
  'BA',
  'BE',
  'BG',
  'BY',
  'CH',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GB',
  'GR',
  'HR',
  'HU',
  'IE',
  'IS',
  'IT',
  'LI',
  'LT',
  'LU',
  'LV',
  'MC',
  'MD',
  'ME',
  'MK',
  'MT',
  'NL',
  'NO',
  'PL',
  'PT',
  'RO',
  'RS',
  'SE',
  'SI',
  'SK',
  'SM',
  'UA',
  'VA',
]);

const AMERICAS_REGIONS = new Set([
  'AG',
  'AI',
  'AR',
  'AW',
  'BB',
  'BL',
  'BM',
  'BO',
  'BQ',
  'BR',
  'BS',
  'BZ',
  'CA',
  'CL',
  'CO',
  'CR',
  'CU',
  'CW',
  'DM',
  'DO',
  'EC',
  'FK',
  'GD',
  'GF',
  'GL',
  'GP',
  'GT',
  'GY',
  'HN',
  'HT',
  'JM',
  'KN',
  'KY',
  'LC',
  'MF',
  'MQ',
  'MS',
  'MX',
  'NI',
  'PA',
  'PE',
  'PM',
  'PR',
  'PY',
  'SR',
  'SV',
  'SX',
  'TC',
  'TT',
  'US',
  'UY',
  'VC',
  'VE',
  'VG',
  'VI',
]);

function detectLocaleGroupFromLocale(locale: string): LocaleGroup {
  const normalized = locale.replace('_', '-');
  const parts = normalized.split('-').filter(Boolean);
  const language = (parts[0] ?? 'en').toLowerCase();
  const region = parts.find((part) => /^[A-Za-z]{2,3}$/.test(part) && part.length !== 4)?.toUpperCase() ?? '';

  if (language.startsWith('ja') || region === 'JP') {
    return 'japan';
  }

  if (language.startsWith('ko') || region === 'KR') {
    return 'korea';
  }

  if (
    language.startsWith('zh') ||
    region === 'CN' ||
    region === 'HK' ||
    region === 'TW' ||
    region === 'MO'
  ) {
    return 'china';
  }

  if (EUROPE_REGIONS.has(region)) {
    return 'europe';
  }

  if (AMERICAS_REGIONS.has(region)) {
    return 'americas';
  }

  return 'americas';
}

export function resolveLocaleGroupFromLocale(locale: string): LocaleGroup {
  return detectLocaleGroupFromLocale(locale);
}

function readExpoLocalizationLocale(): string | null {
  try {
    const expoLocalization = require('expo-localization') as {
      getLocales?: () => Array<{ languageTag?: string; languageCode?: string; regionCode?: string }>;
      locale?: string;
    };

    if (typeof expoLocalization.getLocales === 'function') {
      const locales = expoLocalization.getLocales();
      const first = locales?.[0];

      if (typeof first?.languageTag === 'string' && first.languageTag) {
        return first.languageTag;
      }

      if (typeof first?.languageCode === 'string' && first.languageCode) {
        if (typeof first.regionCode === 'string' && first.regionCode) {
          return `${first.languageCode}-${first.regionCode}`;
        }
        return first.languageCode;
      }
    }

    if (typeof expoLocalization.locale === 'string' && expoLocalization.locale) {
      return expoLocalization.locale;
    }
  } catch {
    // no-op
  }

  return null;
}

function readReactNativeLocale(): string | null {
  try {
    const reactNative = require('react-native') as {
      NativeModules?: {
        SettingsManager?: { settings?: { AppleLanguages?: string[]; AppleLocale?: string } };
        I18nManager?: { localeIdentifier?: string };
      };
    };

    const settings = reactNative.NativeModules?.SettingsManager?.settings;
    const appleLanguages = settings?.AppleLanguages;
    if (Array.isArray(appleLanguages) && typeof appleLanguages[0] === 'string') {
      return appleLanguages[0];
    }

    if (typeof settings?.AppleLocale === 'string' && settings.AppleLocale) {
      return settings.AppleLocale;
    }

    const androidLocale = reactNative.NativeModules?.I18nManager?.localeIdentifier;
    if (typeof androidLocale === 'string' && androidLocale) {
      return androidLocale;
    }
  } catch {
    // no-op
  }

  return null;
}

function readSystemLocale(): string {
  const expoLocale = readExpoLocalizationLocale();
  if (expoLocale) {
    return expoLocale;
  }

  const nativeLocale = readReactNativeLocale();
  if (nativeLocale) {
    return nativeLocale;
  }

  const nav = globalThis.navigator as { language?: string } | undefined;
  if (nav?.language) {
    return nav.language;
  }

  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (locale) return locale;
  } catch {
    // no-op
  }

  return 'en-US';
}

const americasText: AppText = {
  localeGroup: 'americas',
  tabs: {
    board: 'Board',
    map: 'Map',
  },
  board: {
    heroLabel: 'Mugimaru Board',
    heroTitle: 'Community Board',
    heroCaption: 'Post updates, ask questions, and connect with other owners.',
    searchPlaceholder: 'Search posts',
    categories: ['General', 'News', 'Question', 'Event', 'Review'],
    latestThreads: 'Latest Threads',
    itemsCount: '{count} items',
    repliesCount: '{count} replies',
    byAuthor: 'by {author}',
    composerTitle: 'Create Post',
    titlePlaceholder: 'Title',
    authorPlaceholder: 'Display name',
    bodyPlaceholder: 'Write your post',
    titleRequired: 'Title is required.',
    bodyRequired: 'Body is required.',
    cancel: 'Cancel',
    post: 'Post',
    anonymous: 'anonymous',
    seedPosts: [
      {
        id: '1',
        title: 'Share your favorite dog run this week',
        body: 'Looking for clean places with shade and water.',
        author: 'mugi_talk',
        category: 'General',
        replies: 12,
        updatedAt: '5m ago',
      },
      {
        id: '2',
        title: 'Weekend meetup near Toyosu',
        body: 'Sunday 10:30. All small and medium dogs welcome.',
        author: 'board_admin',
        category: 'Event',
        replies: 4,
        updatedAt: '23m ago',
      },
      {
        id: '3',
        title: 'Any emergency vet open after 20:00?',
        body: 'Need recommendations around central Tokyo.',
        author: 'dev_ayaka',
        category: 'Question',
        replies: 9,
        updatedAt: '1h ago',
      },
    ],
  },
  signup: {
    title: 'Create your account',
    caption: 'Find dog runs, vet clinics, and connect with owners.',
    tabLine: 'LINE',
    tabX: 'X',
    tabEmail: 'Email',
    lineTitle: 'Connect with LINE',
    lineCaption: 'Quick signup with your LINE account.',
    lineAction: 'Continue with LINE',
    xTitle: 'Connect with X',
    xCaption: 'Use your X account for one-tap signup.',
    xAction: 'Continue with X',
    emailTitle: 'Register with Email',
    fullNamePlaceholder: 'Full name',
    emailPlaceholder: 'Email address',
    passwordPlaceholder: 'Password (8+ chars)',
    emailAction: 'Create account',
    socialConnected: '{provider} sign-in completed.',
    emailConnected: 'Email signup completed as prototype.',
    nameRequired: 'Please enter your name.',
    emailInvalid: 'Please enter a valid email address.',
    passwordTooShort: 'Password must be at least 8 characters.',
  },
  map: {
    title: 'Map',
    caption: 'Spots and reviews synced with Supabase',
    note: 'Google Map rendering requires Dev Client. Data mode is enabled.',
    loading: 'Loading...',
    envMissing: 'Supabase env missing. Running local fallback data.',
    connected: 'Connected to Supabase.',
    failedLoadSpots: 'Failed to load spots.',
    failedLoadReviews: 'Failed to load reviews.',
    spotRequired: 'Spot name and valid latitude/longitude are required.',
    addedLocalSpot: 'Added locally. Set Supabase env to persist.',
    savedSpot: 'Spot saved to Supabase.',
    failedSaveSpot: 'Failed to save spot.',
    selectSpotFirst: 'Select a spot first.',
    reviewRequired: 'Author, rating, and comment are required.',
    addedLocalReview: 'Review added locally. Set Supabase env to persist.',
    savedReview: 'Review saved to Supabase.',
    failedSaveReview: 'Failed to save review.',
    addSpotTitle: 'Add Spot',
    dogRun: 'Dog Run',
    vetClinic: 'Vet Clinic',
    spotNamePlaceholder: 'Spot name',
    latitudePlaceholder: 'lat',
    longitudePlaceholder: 'lng',
    saveSpotAction: 'Save Spot',
    reviewsTitle: 'Reviews',
    reviewsFor: 'Reviews for {name}',
    authorPlaceholder: 'Author name',
    ratingPlaceholder: 'Rating 1-5',
    reviewPlaceholder: 'Write your review',
    saveReviewAction: 'Save Review',
    reviewLine: '{author} - {rating}/5',
  },
};

const europeText: AppText = {
  ...americasText,
  localeGroup: 'europe',
  board: {
    ...americasText.board,
    seedPosts: [
      {
        id: '1',
        title: 'Share your favourite dog run this week',
        body: 'Looking for clean places with shade and water.',
        author: 'mugi_talk',
        category: 'General',
        replies: 12,
        updatedAt: '5m ago',
      },
      {
        id: '2',
        title: 'Weekend meetup near Toyosu',
        body: 'Sunday 10:30. All small and medium dogs welcome.',
        author: 'board_admin',
        category: 'Event',
        replies: 4,
        updatedAt: '23m ago',
      },
      {
        id: '3',
        title: 'Any emergency vet open after 20:00?',
        body: 'Need recommendations around central Tokyo.',
        author: 'dev_ayaka',
        category: 'Question',
        replies: 9,
        updatedAt: '1h ago',
      },
    ],
  },
};

const chinaText: AppText = {
  localeGroup: 'china',
  tabs: {
    board: '社区',
    map: '地图',
  },
  board: {
    heroLabel: 'Mugimaru 社区',
    heroTitle: '宠物主交流区',
    heroCaption: '发布动态、提问并与其他宠物主互动。',
    searchPlaceholder: '搜索帖子',
    categories: ['综合', '公告', '提问', '活动', '评测'],
    latestThreads: '最新主题',
    itemsCount: '{count} 条',
    repliesCount: '{count} 条回复',
    byAuthor: '作者 {author}',
    composerTitle: '发布帖子',
    titlePlaceholder: '标题',
    authorPlaceholder: '昵称',
    bodyPlaceholder: '写下你的内容',
    titleRequired: '请输入标题。',
    bodyRequired: '请输入正文。',
    cancel: '取消',
    post: '发布',
    anonymous: '匿名用户',
    seedPosts: [
      {
        id: '1',
        title: '本周推荐的狗狗运动场在哪里？',
        body: '希望有阴凉和饮水点，环境干净。',
        author: 'mugi_talk',
        category: '综合',
        replies: 12,
        updatedAt: '5分钟前',
      },
      {
        id: '2',
        title: '周末丰洲线下见面活动',
        body: '周日10:30开始，小中型犬都欢迎。',
        author: 'board_admin',
        category: '活动',
        replies: 4,
        updatedAt: '23分钟前',
      },
      {
        id: '3',
        title: '20:00后还有急诊宠物医院吗？',
        body: '求东京市区附近推荐。',
        author: 'dev_ayaka',
        category: '提问',
        replies: 9,
        updatedAt: '1小时前',
      },
    ],
  },
  signup: {
    title: '创建账号',
    caption: '查找狗狗运动场、宠物医院，并与宠物主交流。',
    tabLine: 'LINE',
    tabX: 'X',
    tabEmail: '邮箱',
    lineTitle: '使用 LINE 登录',
    lineCaption: '用 LINE 账号快速注册。',
    lineAction: '继续使用 LINE',
    xTitle: '使用 X 登录',
    xCaption: '用 X 账号一键注册。',
    xAction: '继续使用 X',
    emailTitle: '邮箱注册',
    fullNamePlaceholder: '姓名',
    emailPlaceholder: '邮箱地址',
    passwordPlaceholder: '密码（至少8位）',
    emailAction: '创建账号',
    socialConnected: '{provider} 登录已完成。',
    emailConnected: '邮箱注册原型已完成。',
    nameRequired: '请输入姓名。',
    emailInvalid: '请输入有效的邮箱地址。',
    passwordTooShort: '密码长度至少8位。',
  },
  map: {
    title: '地图',
    caption: '与 Supabase 同步的地点与评价',
    note: 'Google 地图渲染需要 Dev Client。当前为数据模式。',
    loading: '加载中...',
    envMissing: '未检测到 Supabase 环境变量，已切换本地数据。',
    connected: '已连接 Supabase。',
    failedLoadSpots: '地点加载失败。',
    failedLoadReviews: '评价加载失败。',
    spotRequired: '请填写地点名称和有效的经纬度。',
    addedLocalSpot: '已添加到本地。配置 Supabase 后可持久化。',
    savedSpot: '地点已保存到 Supabase。',
    failedSaveSpot: '地点保存失败。',
    selectSpotFirst: '请先选择一个地点。',
    reviewRequired: '请填写作者、评分和评价内容。',
    addedLocalReview: '评价已添加到本地。配置 Supabase 后可持久化。',
    savedReview: '评价已保存到 Supabase。',
    failedSaveReview: '评价保存失败。',
    addSpotTitle: '添加地点',
    dogRun: '狗狗运动场',
    vetClinic: '宠物医院',
    spotNamePlaceholder: '地点名称',
    latitudePlaceholder: '纬度',
    longitudePlaceholder: '经度',
    saveSpotAction: '保存地点',
    reviewsTitle: '评价',
    reviewsFor: '{name} 的评价',
    authorPlaceholder: '作者昵称',
    ratingPlaceholder: '评分 1-5',
    reviewPlaceholder: '写下你的评价',
    saveReviewAction: '保存评价',
    reviewLine: '{author} - {rating}/5',
  },
};

const koreaText: AppText = {
  localeGroup: 'korea',
  tabs: {
    board: '게시판',
    map: '지도',
  },
  board: {
    heroLabel: 'Mugimaru Board',
    heroTitle: '커뮤니티 게시판',
    heroCaption: '소식 공유, 질문 작성, 반려인과의 교류를 시작하세요.',
    searchPlaceholder: '게시글 검색',
    categories: ['일반', '공지', '질문', '이벤트', '리뷰'],
    latestThreads: '최신 스레드',
    itemsCount: '{count}개',
    repliesCount: '댓글 {count}개',
    byAuthor: '{author} 작성',
    composerTitle: '게시글 작성',
    titlePlaceholder: '제목',
    authorPlaceholder: '닉네임',
    bodyPlaceholder: '내용을 입력하세요',
    titleRequired: '제목을 입력해 주세요.',
    bodyRequired: '본문을 입력해 주세요.',
    cancel: '취소',
    post: '게시',
    anonymous: '익명',
    seedPosts: [
      {
        id: '1',
        title: '이번 주 추천 도그런 장소 공유해요',
        body: '그늘과 물이 있는 깨끗한 장소를 찾고 있어요.',
        author: 'mugi_talk',
        category: '일반',
        replies: 12,
        updatedAt: '5분 전',
      },
      {
        id: '2',
        title: '도요스 주말 모임 참여자 모집',
        body: '일요일 10:30 시작, 소형/중형견 환영합니다.',
        author: 'board_admin',
        category: '이벤트',
        replies: 4,
        updatedAt: '23분 전',
      },
      {
        id: '3',
        title: '20:00 이후 응급 동물병원 추천 부탁드립니다',
        body: '도쿄 중심부 근처 추천을 찾고 있어요.',
        author: 'dev_ayaka',
        category: '질문',
        replies: 9,
        updatedAt: '1시간 전',
      },
    ],
  },
  signup: {
    title: '회원가입',
    caption: '도그런과 동물병원을 찾고 반려인과 소통하세요.',
    tabLine: 'LINE',
    tabX: 'X',
    tabEmail: '이메일',
    lineTitle: 'LINE으로 가입',
    lineCaption: 'LINE 계정으로 빠르게 시작할 수 있습니다.',
    lineAction: 'LINE으로 계속',
    xTitle: 'X로 가입',
    xCaption: 'X 계정으로 간편하게 가입할 수 있습니다.',
    xAction: 'X로 계속',
    emailTitle: '이메일 가입',
    fullNamePlaceholder: '이름',
    emailPlaceholder: '이메일 주소',
    passwordPlaceholder: '비밀번호 (8자 이상)',
    emailAction: '계정 만들기',
    socialConnected: '{provider} 로그인 완료.',
    emailConnected: '이메일 가입 프로토타입이 완료되었습니다.',
    nameRequired: '이름을 입력해 주세요.',
    emailInvalid: '유효한 이메일 주소를 입력해 주세요.',
    passwordTooShort: '비밀번호는 8자 이상이어야 합니다.',
  },
  map: {
    title: '지도',
    caption: 'Supabase와 동기화된 장소 및 후기',
    note: 'Google 지도 렌더링은 Dev Client가 필요합니다. 현재 데이터 모드입니다.',
    loading: '로딩 중...',
    envMissing: 'Supabase 환경 변수가 없어 로컬 데이터로 실행합니다.',
    connected: 'Supabase에 연결되었습니다.',
    failedLoadSpots: '장소를 불러오지 못했습니다.',
    failedLoadReviews: '후기를 불러오지 못했습니다.',
    spotRequired: '장소 이름과 올바른 위도/경도를 입력해 주세요.',
    addedLocalSpot: '로컬에 추가했습니다. Supabase 설정 시 영구 저장됩니다.',
    savedSpot: '장소가 Supabase에 저장되었습니다.',
    failedSaveSpot: '장소 저장에 실패했습니다.',
    selectSpotFirst: '먼저 장소를 선택해 주세요.',
    reviewRequired: '작성자, 평점, 후기를 입력해 주세요.',
    addedLocalReview: '로컬에 후기 추가됨. Supabase 설정 시 영구 저장됩니다.',
    savedReview: '후기가 Supabase에 저장되었습니다.',
    failedSaveReview: '후기 저장에 실패했습니다.',
    addSpotTitle: '장소 추가',
    dogRun: '도그런',
    vetClinic: '동물병원',
    spotNamePlaceholder: '장소 이름',
    latitudePlaceholder: '위도',
    longitudePlaceholder: '경도',
    saveSpotAction: '장소 저장',
    reviewsTitle: '후기',
    reviewsFor: '{name} 후기',
    authorPlaceholder: '작성자',
    ratingPlaceholder: '평점 1-5',
    reviewPlaceholder: '후기를 입력하세요',
    saveReviewAction: '후기 저장',
    reviewLine: '{author} - {rating}/5',
  },
};

const japanText: AppText = {
  localeGroup: 'japan',
  tabs: {
    board: '掲示板',
    map: 'マップ',
  },
  board: {
    heroLabel: 'Mugimaru Board',
    heroTitle: 'コミュニティ掲示板',
    heroCaption: '投稿・質問・交流をこの1画面で進められます。',
    searchPlaceholder: '投稿を検索',
    categories: ['雑談', 'お知らせ', '質問', 'イベント', 'レビュー'],
    latestThreads: '新着スレッド',
    itemsCount: '{count}件',
    repliesCount: '{count}件の返信',
    byAuthor: '{author} さん',
    composerTitle: '新規投稿',
    titlePlaceholder: 'タイトル',
    authorPlaceholder: '表示名',
    bodyPlaceholder: '投稿内容を入力',
    titleRequired: 'タイトルを入力してください。',
    bodyRequired: '本文を入力してください。',
    cancel: 'キャンセル',
    post: '投稿する',
    anonymous: '匿名ユーザー',
    seedPosts: [
      {
        id: '1',
        title: '今週おすすめのドッグランを教えてください',
        body: '日陰と水場がある清潔な場所を探しています。',
        author: 'mugi_talk',
        category: '雑談',
        replies: 12,
        updatedAt: '5分前',
      },
      {
        id: '2',
        title: '豊洲エリアで週末オフ会を開催します',
        body: '日曜10:30開始。小型犬・中型犬歓迎です。',
        author: 'board_admin',
        category: 'イベント',
        replies: 4,
        updatedAt: '23分前',
      },
      {
        id: '3',
        title: '20時以降に診てもらえる動物病院ありますか？',
        body: '都内中心部でおすすめがあれば教えてください。',
        author: 'dev_ayaka',
        category: '質問',
        replies: 9,
        updatedAt: '1時間前',
      },
    ],
  },
  signup: {
    title: '会員登録',
    caption: 'ドッグランや病院を探し、飼い主同士でつながりましょう。',
    tabLine: 'LINE',
    tabX: 'X',
    tabEmail: 'メール',
    lineTitle: 'LINEで登録',
    lineCaption: 'LINEアカウントで素早く登録できます。',
    lineAction: 'LINEで続行',
    xTitle: 'Xで登録',
    xCaption: 'Xアカウントでワンタップ登録できます。',
    xAction: 'Xで続行',
    emailTitle: 'メールアドレスで登録',
    fullNamePlaceholder: '氏名',
    emailPlaceholder: 'メールアドレス',
    passwordPlaceholder: 'パスワード（8文字以上）',
    emailAction: 'アカウント作成',
    socialConnected: '{provider} でのログインが完了しました。',
    emailConnected: 'メール登録のプロトタイプが完了しました。',
    nameRequired: '氏名を入力してください。',
    emailInvalid: '有効なメールアドレスを入力してください。',
    passwordTooShort: 'パスワードは8文字以上で入力してください。',
  },
  map: {
    title: 'マップ',
    caption: 'Supabase連携のスポットと口コミ',
    note: 'Google Mapの描画はDev Clientが必要です。現在はデータモードです。',
    loading: '読み込み中...',
    envMissing: 'Supabase環境変数が未設定のためローカルデータで表示しています。',
    connected: 'Supabaseに接続しました。',
    failedLoadSpots: 'スポットの取得に失敗しました。',
    failedLoadReviews: '口コミの取得に失敗しました。',
    spotRequired: 'スポット名と有効な緯度・経度を入力してください。',
    addedLocalSpot: 'ローカルに追加しました。Supabase設定後に永続化できます。',
    savedSpot: 'スポットをSupabaseに保存しました。',
    failedSaveSpot: 'スポット保存に失敗しました。',
    selectSpotFirst: '先にスポットを選択してください。',
    reviewRequired: '投稿者名、評価、口コミ内容を入力してください。',
    addedLocalReview: 'ローカルに口コミを追加しました。Supabase設定後に永続化できます。',
    savedReview: '口コミをSupabaseに保存しました。',
    failedSaveReview: '口コミ保存に失敗しました。',
    addSpotTitle: 'スポットを追加',
    dogRun: 'ドッグラン',
    vetClinic: '動物病院',
    spotNamePlaceholder: 'スポット名',
    latitudePlaceholder: '緯度',
    longitudePlaceholder: '経度',
    saveSpotAction: 'スポット保存',
    reviewsTitle: '口コミ',
    reviewsFor: '{name} の口コミ',
    authorPlaceholder: '投稿者名',
    ratingPlaceholder: '評価 1-5',
    reviewPlaceholder: '口コミを入力',
    saveReviewAction: '口コミ保存',
    reviewLine: '{author} - {rating}/5',
  },
};

const texts: Record<LocaleGroup, AppText> = {
  americas: americasText,
  europe: europeText,
  china: chinaText,
  korea: koreaText,
  japan: japanText,
};

const detectedLocale = readSystemLocale();
const currentLocaleGroup = detectLocaleGroupFromLocale(detectedLocale);

export function getAppText() {
  return texts[currentLocaleGroup];
}

export function getCurrentLocaleGroup() {
  return currentLocaleGroup;
}

export function getDetectedLocale() {
  return detectedLocale;
}

export function formatMessage(template: string, vars: TemplateVars) {
  return Object.entries(vars).reduce(
    (result, [name, value]) => result.replace(new RegExp(`\\{${name}\\}`, 'g'), String(value)),
    template
  );
}

import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SettingsPageScaffold, SettingsSection } from '@/app/settings/_shared';
import { useAuth } from '@/lib/auth-context';
import { useAppTheme } from '@/lib/app-theme-context';
import { pickImageFromLibrary } from '@/lib/mobile-image-picker';
import {
  AVATAR_ICON_OPTIONS,
  buildAvatarIconValue,
  getAvatarIconGlyph,
  parseAvatarValue,
} from '@/lib/profile-avatar';

type AreaOption = {
  prefecture: string;
  cities: string[];
};

const AREA_OPTIONS: AreaOption[] = [
  { prefecture: '北海道', cities: ['札幌市', '函館市', '旭川市', '小樽市', '帯広市'] },
  { prefecture: '青森県', cities: ['青森市', '弘前市', '八戸市'] },
  { prefecture: '岩手県', cities: ['盛岡市', '花巻市', '一関市'] },
  { prefecture: '宮城県', cities: ['仙台市', '石巻市', '名取市'] },
  { prefecture: '秋田県', cities: ['秋田市', '横手市', '大館市'] },
  { prefecture: '山形県', cities: ['山形市', '米沢市', '鶴岡市'] },
  { prefecture: '福島県', cities: ['福島市', '郡山市', 'いわき市'] },
  { prefecture: '茨城県', cities: ['水戸市', 'つくば市', '土浦市'] },
  { prefecture: '栃木県', cities: ['宇都宮市', '小山市', '栃木市'] },
  { prefecture: '群馬県', cities: ['前橋市', '高崎市', '太田市'] },
  { prefecture: '埼玉県', cities: ['さいたま市', '川口市', '川越市', '所沢市'] },
  { prefecture: '千葉県', cities: ['千葉市', '船橋市', '柏市', '市川市'] },
  {
    prefecture: '東京都',
    cities: [
      '千代田区',
      '中央区',
      '港区',
      '新宿区',
      '文京区',
      '台東区',
      '墨田区',
      '江東区',
      '品川区',
      '目黒区',
      '大田区',
      '世田谷区',
      '渋谷区',
      '中野区',
      '杉並区',
      '豊島区',
      '北区',
      '荒川区',
      '板橋区',
      '練馬区',
      '足立区',
      '葛飾区',
      '江戸川区',
      '八王子市',
      '立川市',
      '武蔵野市',
      '町田市',
    ],
  },
  { prefecture: '神奈川県', cities: ['横浜市', '川崎市', '相模原市', '藤沢市', '鎌倉市'] },
  { prefecture: '新潟県', cities: ['新潟市', '長岡市', '上越市'] },
  { prefecture: '富山県', cities: ['富山市', '高岡市', '射水市'] },
  { prefecture: '石川県', cities: ['金沢市', '小松市', '白山市'] },
  { prefecture: '福井県', cities: ['福井市', '敦賀市', '坂井市'] },
  { prefecture: '山梨県', cities: ['甲府市', '甲斐市', '富士吉田市'] },
  { prefecture: '長野県', cities: ['長野市', '松本市', '上田市'] },
  { prefecture: '岐阜県', cities: ['岐阜市', '大垣市', '高山市'] },
  { prefecture: '静岡県', cities: ['静岡市', '浜松市', '沼津市'] },
  { prefecture: '愛知県', cities: ['名古屋市', '豊田市', '岡崎市', '一宮市'] },
  { prefecture: '三重県', cities: ['津市', '四日市市', '伊勢市'] },
  { prefecture: '滋賀県', cities: ['大津市', '草津市', '彦根市'] },
  { prefecture: '京都府', cities: ['京都市', '宇治市', '亀岡市'] },
  { prefecture: '大阪府', cities: ['大阪市', '堺市', '東大阪市', '豊中市'] },
  { prefecture: '兵庫県', cities: ['神戸市', '姫路市', '西宮市', '尼崎市'] },
  { prefecture: '奈良県', cities: ['奈良市', '橿原市', '生駒市'] },
  { prefecture: '和歌山県', cities: ['和歌山市', '田辺市', '橋本市'] },
  { prefecture: '鳥取県', cities: ['鳥取市', '米子市', '倉吉市'] },
  { prefecture: '島根県', cities: ['松江市', '出雲市', '浜田市'] },
  { prefecture: '岡山県', cities: ['岡山市', '倉敷市', '津山市'] },
  { prefecture: '広島県', cities: ['広島市', '福山市', '呉市'] },
  { prefecture: '山口県', cities: ['山口市', '下関市', '宇部市'] },
  { prefecture: '徳島県', cities: ['徳島市', '鳴門市', '阿南市'] },
  { prefecture: '香川県', cities: ['高松市', '丸亀市', '坂出市'] },
  { prefecture: '愛媛県', cities: ['松山市', '今治市', '新居浜市'] },
  { prefecture: '高知県', cities: ['高知市', '南国市', '四万十市'] },
  { prefecture: '福岡県', cities: ['福岡市', '北九州市', '久留米市'] },
  { prefecture: '佐賀県', cities: ['佐賀市', '唐津市', '鳥栖市'] },
  { prefecture: '長崎県', cities: ['長崎市', '佐世保市', '諫早市'] },
  { prefecture: '熊本県', cities: ['熊本市', '八代市', '天草市'] },
  { prefecture: '大分県', cities: ['大分市', '別府市', '中津市'] },
  { prefecture: '宮崎県', cities: ['宮崎市', '都城市', '延岡市'] },
  { prefecture: '鹿児島県', cities: ['鹿児島市', '霧島市', '鹿屋市'] },
  { prefecture: '沖縄県', cities: ['那覇市', '沖縄市', '浦添市', '宜野湾市'] },
];

function AvatarPreview({ avatarValue, fallbackLetter }: { avatarValue: string; fallbackLetter: string }) {
  const parsed = parseAvatarValue(avatarValue);

  if (parsed.type === 'image') {
    return <Image source={{ uri: parsed.uri }} style={styles.avatarImage} />;
  }
  if (parsed.type === 'icon') {
    return (
      <View style={styles.avatarFallback}>
        <Text style={styles.avatarIconGlyph}>{getAvatarIconGlyph(parsed.iconId)}</Text>
      </View>
    );
  }
  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarFallbackText}>{fallbackLetter || '?'}</Text>
    </View>
  );
}

function HeaderPreview({ headerValue }: { headerValue: string }) {
  const trimmed = headerValue.trim();
  if (trimmed) {
    return <Image source={{ uri: trimmed }} style={styles.headerImage} />;
  }
  return (
    <View style={styles.headerFallback}>
      <Text style={styles.headerFallbackText}>Mugimaru</Text>
    </View>
  );
}

export default function ProfileSettingsScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const fontFamily = typography.fontFamily;
  const scale = typography.scale;

  const [bio, setBio] = useState(profile?.bio ?? '');
  const [dogName, setDogName] = useState(profile?.dogName ?? '');
  const [dogBreed, setDogBreed] = useState(profile?.dogBreed ?? '');
  const [prefecture, setPrefecture] = useState(profile?.prefecture ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [avatarValue, setAvatarValue] = useState(profile?.avatarUrl ?? '');
  const [headerValue, setHeaderValue] = useState(profile?.headerUrl ?? '');
  const [isActionModalOpen, setActionModalOpen] = useState(false);
  const [isHeaderModalOpen, setHeaderModalOpen] = useState(false);
  const [isIconModalOpen, setIconModalOpen] = useState(false);
  const [isPrefectureModalOpen, setPrefectureModalOpen] = useState(false);
  const [isCityModalOpen, setCityModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const cityOptions = useMemo(
    () => AREA_OPTIONS.find((item) => item.prefecture === prefecture)?.cities ?? [],
    [prefecture]
  );
  const previewLetter = useMemo(
    () => (dogName.trim().charAt(0) || profile?.name?.trim().charAt(0) || '?').toUpperCase(),
    [dogName, profile?.name]
  );

  useEffect(() => {
    setBio(profile?.bio ?? '');
    setDogName(profile?.dogName ?? '');
    setDogBreed(profile?.dogBreed ?? '');
    setPrefecture(profile?.prefecture ?? '');
    setCity(profile?.city ?? '');
    setAvatarValue(profile?.avatarUrl ?? '');
    setHeaderValue(profile?.headerUrl ?? '');
  }, [profile]);

  const handleUploadPhoto = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setAvatarValue(picked.dataUrl);
      setMessage('写真を選択しました。保存するとプロフィールに反映されます。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '写真の選択に失敗しました。');
    }
  };

  const handleUploadHeader = async () => {
    try {
      const picked = await pickImageFromLibrary();
      if (!picked) return;
      setHeaderValue(picked.dataUrl);
      setMessage('ヘッダーを選択しました。保存するとプロフィールに反映されます。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ヘッダーの選択に失敗しました。');
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    const nextName = dogName.trim() || profile.name || 'ユーザー';

    try {
      setSaving(true);
      await updateProfile({
        name: nextName,
        email: profile.email,
        avatarUrl: avatarValue.trim(),
        headerUrl: headerValue.trim(),
        bio: bio.trim(),
        dogName: dogName.trim(),
        dogBreed: dogBreed.trim(),
        prefecture,
        city,
      });
      setMessage('プロフィールを保存しました。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'プロフィールの保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const choosePrefecture = (nextPrefecture: string) => {
    setPrefecture(nextPrefecture);
    setCity('');
    setPrefectureModalOpen(false);
  };

  return (
    <SettingsPageScaffold
      title="プロフィール"
      subtitle="掲示板やプロフィール画面に表示される情報を設定します。"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}
    >
      <SettingsSection theme={activeTheme} typography={typography} title="画像">
        <Pressable
          style={[styles.headerTapArea, { borderColor: colors.border, backgroundColor: colors.background }]}
          onPress={() => setHeaderModalOpen(true)}>
          <HeaderPreview headerValue={headerValue} />
        </Pressable>
        <View style={styles.avatarRow}>
          <Pressable
            style={[styles.avatarTapArea, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setActionModalOpen(true)}>
            <AvatarPreview avatarValue={avatarValue} fallbackLetter={previewLetter} />
          </Pressable>
        </View>
      </SettingsSection>

      <SettingsSection theme={activeTheme} typography={typography} title="公開プロフィール">
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>愛犬の名前</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontFamily,
                  fontSize: 14 * scale,
                },
              ]}
              value={dogName}
              onChangeText={setDogName}
              placeholder="むぎ"
              placeholderTextColor={colors.mutedText}
            />
          </View>
          <View style={styles.inlineField}>
            <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>犬種</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                  color: colors.text,
                  fontFamily,
                  fontSize: 14 * scale,
                },
              ]}
              value={dogBreed}
              onChangeText={setDogBreed}
              placeholder="柴犬"
              placeholderTextColor={colors.mutedText}
            />
          </View>
        </View>

        <View style={styles.fieldWrap}>
          <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>自己紹介</Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                borderColor: colors.border,
                backgroundColor: colors.background,
                color: colors.text,
                fontFamily,
                fontSize: 14 * scale,
              },
            ]}
            value={bio}
            onChangeText={setBio}
            placeholder="飼い主さんや愛犬のことを入力"
            placeholderTextColor={colors.mutedText}
            multiline
            textAlignVertical="top"
          />
        </View>
      </SettingsSection>

      <SettingsSection theme={activeTheme} typography={typography} title="お住まいの地域">
        <View style={styles.inlineFields}>
          <View style={styles.inlineField}>
            <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>都道府県</Text>
            <Pressable
              style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setPrefectureModalOpen(true)}>
              <Text style={[styles.selectButtonText, { color: prefecture ? colors.text : colors.mutedText, fontFamily }]}>
                {prefecture || '選択してください'}
              </Text>
            </Pressable>
          </View>
          <View style={styles.inlineField}>
            <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>
              市区町村
            </Text>
            <Pressable
              style={[styles.selectButton, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                if (prefecture) setCityModalOpen(true);
              }}>
              <Text style={[styles.selectButtonText, { color: city ? colors.text : colors.mutedText, fontFamily }]}>
                {city || (prefecture ? '選択してください' : '先に都道府県を選択')}
              </Text>
            </Pressable>
          </View>
        </View>
        <Text style={[styles.areaNote, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>
          この情報は近くのイベントを表示するのに使用します。
        </Text>
      </SettingsSection>

      <Pressable style={[styles.saveButton, { backgroundColor: colors.accent }]} onPress={() => void handleSave()} disabled={saving}>
        <Text style={[styles.saveButtonText, { color: colors.accentContrast, fontFamily }]}>
          {saving ? '保存中...' : '保存する'}
        </Text>
      </Pressable>
      {message ? <Text style={[styles.messageText, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>{message}</Text> : null}

      <SelectionModal
        visible={isPrefectureModalOpen}
        title="都道府県を選択"
        options={AREA_OPTIONS.map((item) => item.prefecture)}
        selected={prefecture}
        onSelect={choosePrefecture}
        onClose={() => setPrefectureModalOpen(false)}
        colors={colors}
        fontFamily={fontFamily}
      />
      <SelectionModal
        visible={isCityModalOpen}
        title="市区町村を選択"
        options={cityOptions}
        selected={city}
        onSelect={(nextCity) => {
          setCity(nextCity);
          setCityModalOpen(false);
        }}
        onClose={() => setCityModalOpen(false)}
        colors={colors}
        fontFamily={fontFamily}
      />

      <Modal visible={isActionModalOpen} transparent animationType="fade" onRequestClose={() => setActionModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily }]}>アイコン</Text>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setActionModalOpen(false);
                setIconModalOpen(true);
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>アイコンを選ぶ</Text>
            </Pressable>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setActionModalOpen(false);
                void handleUploadPhoto();
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>写真をアップロード</Text>
            </Pressable>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setAvatarValue('');
                setActionModalOpen(false);
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>現在の画像を削除</Text>
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setActionModalOpen(false)}>
              <Text style={[styles.modalCancelText, { color: colors.mutedText, fontFamily }]}>キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isHeaderModalOpen} transparent animationType="fade" onRequestClose={() => setHeaderModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily }]}>ヘッダー</Text>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setHeaderModalOpen(false);
                void handleUploadHeader();
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>写真をアップロード</Text>
            </Pressable>
            <Pressable
              style={[styles.modalAction, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => {
                setHeaderValue('');
                setHeaderModalOpen(false);
              }}>
              <Text style={[styles.modalActionText, { color: colors.text, fontFamily }]}>現在の画像を削除</Text>
            </Pressable>
            <Pressable style={styles.modalCancel} onPress={() => setHeaderModalOpen(false)}>
              <Text style={[styles.modalCancelText, { color: colors.mutedText, fontFamily }]}>キャンセル</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={isIconModalOpen} transparent animationType="fade" onRequestClose={() => setIconModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.iconModalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily }]}>アイコンを選択</Text>
            <ScrollView contentContainerStyle={styles.iconGrid} showsVerticalScrollIndicator={false}>
              {AVATAR_ICON_OPTIONS.map((item) => {
                const selected = avatarValue.trim() === buildAvatarIconValue(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.iconButton,
                      {
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.chip : colors.background,
                      },
                    ]}
                    onPress={() => {
                      setAvatarValue(buildAvatarIconValue(item.id));
                      setIconModalOpen(false);
                    }}>
                    <Text style={styles.iconButtonGlyph}>{item.glyph}</Text>
                    <Text style={[styles.iconButtonLabel, { color: colors.mutedText, fontFamily }]}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable style={styles.modalCancel} onPress={() => setIconModalOpen(false)}>
              <Text style={[styles.modalCancelText, { color: colors.mutedText, fontFamily }]}>閉じる</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SettingsPageScaffold>
  );
}

function SelectionModal({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  colors,
  fontFamily,
}: {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  colors: { background: string; border: string; surface: string; text: string; mutedText: string; accent: string; chip: string };
  fontFamily: string | undefined;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.selectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.modalTitle, { color: colors.text, fontFamily }]}>{title}</Text>
          <ScrollView contentContainerStyle={styles.selectionList}>
            {options.map((option) => {
              const active = option === selected;
              return (
                <Pressable
                  key={option}
                  style={[
                    styles.selectionItem,
                    {
                      borderColor: active ? colors.accent : colors.border,
                      backgroundColor: active ? colors.chip : colors.background,
                    },
                  ]}
                  onPress={() => onSelect(option)}>
                  <Text style={[styles.selectionText, { color: colors.text, fontFamily }]}>{option}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable style={styles.modalCancel} onPress={onClose}>
            <Text style={[styles.modalCancelText, { color: colors.mutedText, fontFamily }]}>閉じる</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarTapArea: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d8dce8',
  },
  avatarIconGlyph: {
    fontSize: 38,
  },
  avatarFallbackText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#253048',
  },
  headerTapArea: {
    width: '100%',
    height: 128,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  headerFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d8c7ad',
  },
  headerFallbackText: {
    color: '#6b4f2f',
    fontSize: 18,
    fontWeight: '900',
  },
  avatarHintWrap: {
    flex: 1,
    gap: 3,
  },
  avatarHintTitle: {
    fontWeight: '800',
  },
  avatarHintBody: {
    fontWeight: '500',
    lineHeight: 18,
  },
  fieldWrap: {
    gap: 6,
  },
  label: {
    fontWeight: '700',
  },
  input: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  textArea: {
    minHeight: 104,
  },
  inlineFields: {
    flexDirection: 'row',
    gap: 10,
  },
  inlineField: {
    flex: 1,
    gap: 6,
  },
  selectButton: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    justifyContent: 'center',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  areaNote: {
    lineHeight: 18,
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 12,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  messageText: {
    marginTop: -4,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(12,16,22,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  iconModalCard: {
    width: '100%',
    maxHeight: '78%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  selectionCard: {
    width: '100%',
    maxHeight: '82%',
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  selectionList: {
    gap: 8,
  },
  selectionItem: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  selectionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalAction: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancel: {
    minHeight: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconButton: {
    width: '31%',
    minHeight: 92,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconButtonGlyph: {
    fontSize: 30,
  },
  iconButtonLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});

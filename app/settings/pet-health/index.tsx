import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { PetHealthButton } from '@/components/pet-health-form';
import { SettingsPageScaffold, SettingsSection } from '@/components/settings-shared';
import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import {
  formatDisplayDate,
  getDueStatus,
  latestVaccinesByType,
  sortVaccinesByDateDesc,
  VACCINE_KIND_LABELS,
  type DueStatus,
  type VaccineRecord,
} from '@/lib/pet-health-store';
import { usePetHealth } from '@/lib/use-pet-health';

const OFFICIAL_REGISTRATION_URL = 'https://reg.mc.env.go.jp/';

function formatChipNumber(value: string) {
  return value.replace(/(\d{3})(\d{3})(\d{3})(\d{3})(\d{3})/, '$1 $2 $3 $4 $5');
}

function vaccineTitle(record: VaccineRecord) {
  const name = record.name.trim();
  if (record.kind === 'rabies') return name ? `狂犬病（${name}）` : '狂犬病';
  return name || VACCINE_KIND_LABELS[record.kind];
}

const DUE_COLORS: Record<DueStatus, string> = {
  none: '#8a8f99',
  ok: '#2f9e6a',
  soon: '#c98a12',
  overdue: '#d6455d',
};

function dueLabel(status: DueStatus, days: number) {
  if (status === 'none') return '次回予定なし';
  if (status === 'overdue') return `${Math.abs(days)}日超過`;
  if (days === 0) return '今日';
  return `あと${days}日`;
}

export default function PetHealthScreen() {
  const router = useRouter();
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const fontFamily = typography.fontFamily;
  const scale = typography.scale;
  const { data, status, clearAll } = usePetHealth();

  const chip = data.microchip;
  const upcoming = latestVaccinesByType(data.vaccines).filter((record) => record.nextDueDate);
  const history = sortVaccinesByDateDesc(data.vaccines);

  const confirmClear = () => {
    Alert.alert('すべての記録を削除', 'この端末に保存したマイクロチップとワクチンの記録をすべて削除します。元に戻せません。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: () => void clearAll() },
    ]);
  };

  const textStyle = (size: number, color = colors.text) => ({ color, fontFamily, fontSize: size * scale });

  return (
    <SettingsPageScaffold
      title="マイクロチップ・ワクチン"
      subtitle="この端末のキーチェーンに保存されます"
      theme={activeTheme}
      typography={typography}
      onBack={() => router.back()}>
      {status === 'unavailable' ? (
        <SettingsSection theme={activeTheme} typography={typography}>
          <Text style={[styles.body, textStyle(14)]}>
            この機能は iPhone アプリでのみ利用できます。記録は端末のキーチェーンに保存され、サーバーには送信されません。
          </Text>
        </SettingsSection>
      ) : status === 'error' ? (
        <SettingsSection theme={activeTheme} typography={typography}>
          <Text style={[styles.body, textStyle(14)]}>記録を読み込めませんでした。端末のロックを解除してから再度開いてください。</Text>
        </SettingsSection>
      ) : status === 'loading' ? null : (
        <>
          <SettingsSection theme={activeTheme} typography={typography} title="マイクロチップ">
            {chip ? (
              <Pressable onPress={() => router.push('/settings/pet-health/microchip')} style={styles.chipCard}>
                <View style={styles.rowBetween}>
                  <Text style={[styles.caption, textStyle(12, colors.mutedText)]}>マイクロチップ番号</Text>
                  <FontAwesome6 name="pen" size={13} color={colors.mutedText} />
                </View>
                <Text selectable style={[styles.chipNumber, textStyle(21)]}>
                  {formatChipNumber(chip.chipNumber)}
                </Text>
                <View style={styles.metaGrid}>
                  <Meta label="装着日" value={formatDisplayDate(chip.implantDate)} textStyle={textStyle} />
                  <Meta label="登録日" value={formatDisplayDate(chip.registrationDate)} textStyle={textStyle} />
                  <Meta label="装着した病院" value={chip.implantClinic || '未設定'} textStyle={textStyle} />
                </View>
              </Pressable>
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={[styles.body, textStyle(13, colors.mutedText)]}>
                  まだ登録されていません。登録証明書を見ながら入力してください。
                </Text>
                <PetHealthButton label="マイクロチップ情報を追加" onPress={() => router.push('/settings/pet-health/microchip')} />
              </View>
            )}
          </SettingsSection>

          <SettingsSection theme={activeTheme} typography={typography} title="次回の接種予定">
            {upcoming.length === 0 ? (
              <Text style={[styles.body, textStyle(13, colors.mutedText)]}>次回予定日が入った記録はありません。</Text>
            ) : (
              upcoming.map((record) => {
                const due = getDueStatus(record.nextDueDate);
                return (
                  <Pressable
                    key={record.id}
                    onPress={() => router.push({ pathname: '/settings/pet-health/vaccine', params: { id: record.id } })}
                    style={[styles.listRow, { borderColor: colors.border }]}>
                    <View style={styles.listText}>
                      <Text style={[styles.rowTitle, textStyle(15)]}>{vaccineTitle(record)}</Text>
                      <Text style={[styles.caption, textStyle(12, colors.mutedText)]}>
                        {formatDisplayDate(record.nextDueDate)}
                      </Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${DUE_COLORS[due.status]}22` }]}>
                      <Text style={[styles.badgeText, { color: DUE_COLORS[due.status], fontFamily }]}>
                        {dueLabel(due.status, due.days)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </SettingsSection>

          <SettingsSection theme={activeTheme} typography={typography} title="ワクチン接種履歴">
            {history.length === 0 ? (
              <Text style={[styles.body, textStyle(13, colors.mutedText)]}>接種記録はまだありません。</Text>
            ) : (
              history.map((record) => (
                <Pressable
                  key={record.id}
                  onPress={() => router.push({ pathname: '/settings/pet-health/vaccine', params: { id: record.id } })}
                  style={[styles.listRow, { borderColor: colors.border }]}>
                  <View style={styles.listText}>
                    <Text style={[styles.rowTitle, textStyle(15)]}>{vaccineTitle(record)}</Text>
                    <Text style={[styles.caption, textStyle(12, colors.mutedText)]}>
                      {formatDisplayDate(record.date)}
                      {record.clinic ? `・${record.clinic}` : ''}
                    </Text>
                  </View>
                  <FontAwesome6 name="chevron-right" size={13} color={colors.mutedText} />
                </Pressable>
              ))
            )}
            <PetHealthButton
              label="接種記録を追加"
              variant={history.length === 0 ? 'primary' : 'secondary'}
              onPress={() => router.push('/settings/pet-health/vaccine')}
            />
          </SettingsSection>

          <SettingsSection theme={activeTheme} typography={typography} title="保存とご注意">
            <Text style={[styles.body, textStyle(12, colors.mutedText)]}>
              記録はこの iPhone のキーチェーンにのみ暗号化して保存され、サーバーや iCloud には送信・同期されません。機種変更や端末の初期化をすると記録は引き継がれないため、登録証明書や接種証明書の原本も保管してください。
            </Text>
            <Text style={[styles.body, textStyle(12, colors.mutedText)]}>
              この画面は飼い主さまの記録用です。マイクロチップの登録・変更届は環境省の公式システムで行ってください。
            </Text>
            <Pressable onPress={() => void Linking.openURL(OFFICIAL_REGISTRATION_URL)}>
              <Text style={[styles.link, textStyle(13, colors.accent)]}>犬と猫のマイクロチップ情報登録（環境省）</Text>
            </Pressable>
            {chip || data.vaccines.length > 0 ? (
              <PetHealthButton label="すべての記録を削除" variant="danger" onPress={confirmClear} />
            ) : null}
          </SettingsSection>
        </>
      )}
    </SettingsPageScaffold>
  );
}

function Meta({
  label,
  value,
  textStyle,
}: {
  label: string;
  value: string;
  textStyle: (size: number, color?: string) => object;
}) {
  const { activeTheme } = useAppTheme();
  return (
    <View style={styles.metaItem}>
      <Text style={[styles.caption, textStyle(11, activeTheme.colors.mutedText)]}>{label}</Text>
      <Text style={[styles.metaValue, textStyle(13)]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontWeight: '600', lineHeight: 19 },
  caption: { fontWeight: '700' },
  chipCard: { gap: 8 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipNumber: { fontWeight: '900', letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8, columnGap: 18 },
  metaItem: { gap: 2, minWidth: 120 },
  metaValue: { fontWeight: '700' },
  emptyWrap: { gap: 10 },
  listRow: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  listText: { flex: 1, gap: 2 },
  rowTitle: { fontWeight: '800' },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  link: { fontWeight: '800', textDecorationLine: 'underline' },
});

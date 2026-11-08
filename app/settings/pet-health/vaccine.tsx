import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { PetHealthButton, PetHealthChips, PetHealthDateField, PetHealthField } from '@/components/pet-health-form';
import { SettingsPageScaffold, SettingsSection } from '@/components/settings-shared';
import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import {
  addOneYear,
  createVaccineId,
  isValidDateOrEmpty,
  parseDate,
  toDateString,
  VACCINE_KIND_LABELS,
  type VaccineKind,
} from '@/lib/pet-health-store';
import { usePetHealth } from '@/lib/use-pet-health';

const KIND_OPTIONS = (Object.keys(VACCINE_KIND_LABELS) as VaccineKind[]).map((id) => ({
  id,
  label: VACCINE_KIND_LABELS[id],
}));

const COMBO_PRESETS = ['5種混合', '6種混合', '8種混合', '10種混合'];

export default function VaccineEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = typeof params.id === 'string' ? params.id : '';
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const { data, status, save } = usePetHealth();

  const [hydrated, setHydrated] = useState(false);
  const [kind, setKind] = useState<VaccineKind>('rabies');
  const [name, setName] = useState('');
  const [date, setDate] = useState(toDateString(new Date()));
  const [nextDueDate, setNextDueDate] = useState('');
  const [clinic, setClinic] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [memo, setMemo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const existing = editingId ? data.vaccines.find((record) => record.id === editingId) : undefined;

  useEffect(() => {
    if (status !== 'ready' || hydrated) return;
    if (existing) {
      setKind(existing.kind);
      setName(existing.name);
      setDate(existing.date);
      setNextDueDate(existing.nextDueDate);
      setClinic(existing.clinic);
      setLotNumber(existing.lotNumber);
      setMemo(existing.memo);
    }
    setHydrated(true);
  }, [status, existing, hydrated]);

  const dateError = submitted && !parseDate(date) ? '接種日を YYYY-MM-DD で入力してください。' : undefined;
  const nextDueError = submitted
    ? !isValidDateOrEmpty(nextDueDate)
      ? '日付の形式が正しくありません。'
      : nextDueDate && parseDate(date) && nextDueDate <= date
        ? '接種日より後の日付を入力してください。'
        : undefined
    : undefined;
  const nameError = submitted && kind === 'other' && !name.trim() ? 'ワクチン名を入力してください。' : undefined;

  const handleSave = async () => {
    setSubmitted(true);
    const valid =
      parseDate(date) &&
      isValidDateOrEmpty(nextDueDate) &&
      !(nextDueDate && nextDueDate <= date) &&
      !(kind === 'other' && !name.trim());
    if (!valid) return;

    const record = {
      id: existing?.id ?? createVaccineId(),
      kind,
      name: name.trim(),
      date,
      nextDueDate,
      clinic: clinic.trim(),
      lotNumber: lotNumber.trim(),
      memo: memo.trim(),
      updatedAt: new Date().toISOString(),
    };

    try {
      setSaving(true);
      await save((current) => ({
        ...current,
        vaccines: current.vaccines.some((item) => item.id === record.id)
          ? current.vaccines.map((item) => (item.id === record.id ? record : item))
          : [...current.vaccines, record],
      }));
      router.back();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existing) return;
    Alert.alert('接種記録を削除', 'この接種記録を削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await save((current) => ({
              ...current,
              vaccines: current.vaccines.filter((item) => item.id !== existing.id),
            }));
            router.back();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : '削除に失敗しました。');
          }
        },
      },
    ]);
  };

  const notFound = status === 'ready' && editingId && !existing;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SettingsPageScaffold
        title={existing ? '接種記録を編集' : '接種記録を追加'}
        subtitle="接種証明書を見ながら入力してください"
        theme={activeTheme}
        typography={typography}
        onBack={() => router.back()}>
        {status === 'unavailable' ? (
          <SettingsSection theme={activeTheme} typography={typography}>
            <Text style={[styles.message, { color: colors.text }]}>この機能は iPhone アプリでのみ利用できます。</Text>
          </SettingsSection>
        ) : notFound ? (
          <SettingsSection theme={activeTheme} typography={typography}>
            <Text style={[styles.message, { color: colors.text }]}>この記録は見つかりませんでした。</Text>
          </SettingsSection>
        ) : (
          <>
            <SettingsSection theme={activeTheme} typography={typography} title="種類">
              <PetHealthChips options={KIND_OPTIONS} value={kind} onChange={setKind} />
              {kind === 'combo' ? (
                <PetHealthChips
                  options={COMBO_PRESETS.map((preset) => ({ id: preset, label: preset }))}
                  value={name}
                  onChange={setName}
                />
              ) : null}
              <PetHealthField
                label={kind === 'rabies' ? 'ワクチン名（任意）' : 'ワクチン名'}
                value={name}
                onChangeText={setName}
                placeholder={kind === 'combo' ? '例: 8種混合' : kind === 'other' ? '例: レプトスピラ' : '製品名など'}
                maxLength={60}
                error={nameError}
              />
            </SettingsSection>

            <SettingsSection theme={activeTheme} typography={typography} title="日付">
              <PetHealthDateField label="接種日" value={date} onChange={setDate} error={dateError} />
              <PetHealthDateField
                label="次回予定日（任意）"
                value={nextDueDate}
                onChange={setNextDueDate}
                hint="狂犬病は年1回の接種が義務です"
                error={nextDueError}
                trailing={
                  <View>
                    <PetHealthButton
                      compact
                      variant="secondary"
                      label="+1年"
                      disabled={!parseDate(date)}
                      onPress={() => setNextDueDate(addOneYear(date))}
                    />
                  </View>
                }
              />
            </SettingsSection>

            <SettingsSection theme={activeTheme} typography={typography} title="詳細">
              <PetHealthField label="動物病院" value={clinic} onChangeText={setClinic} placeholder="〇〇動物病院" maxLength={80} />
              <PetHealthField
                label="ロット番号（任意）"
                value={lotNumber}
                onChangeText={setLotNumber}
                autoCapitalize="characters"
                maxLength={40}
              />
              <PetHealthField
                label="メモ"
                value={memo}
                onChangeText={setMemo}
                placeholder="副反応の有無、注射済票の番号など"
                multiline
                maxLength={500}
              />
            </SettingsSection>

            <PetHealthButton label={saving ? '保存中...' : '保存する'} onPress={() => void handleSave()} disabled={saving || !hydrated} />
            {existing ? <PetHealthButton label="この記録を削除" variant="danger" onPress={handleDelete} /> : null}
            {message ? <Text style={[styles.message, { color: colors.mutedText }]}>{message}</Text> : null}
          </>
        )}
      </SettingsPageScaffold>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  message: { fontSize: 13, fontWeight: '600' },
});

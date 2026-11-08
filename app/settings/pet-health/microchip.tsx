import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

import { PetHealthButton, PetHealthDateField, PetHealthField } from '@/components/pet-health-form';
import { SettingsPageScaffold, SettingsSection } from '@/components/settings-shared';
import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { isValidChipNumber, isValidDateOrEmpty, normalizeChipNumber } from '@/lib/pet-health-store';
import { usePetHealth } from '@/lib/use-pet-health';

export default function MicrochipEditScreen() {
  const router = useRouter();
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const { data, status, save } = usePetHealth();

  const [hydrated, setHydrated] = useState(false);
  const [chipNumber, setChipNumber] = useState('');
  const [implantDate, setImplantDate] = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [implantClinic, setImplantClinic] = useState('');
  const [memo, setMemo] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (status !== 'ready' || hydrated) return;
    const chip = data.microchip;
    if (chip) {
      setChipNumber(chip.chipNumber);
      setImplantDate(chip.implantDate);
      setRegistrationDate(chip.registrationDate);
      setImplantClinic(chip.implantClinic);
      setMemo(chip.memo);
    }
    setHydrated(true);
  }, [status, data.microchip, hydrated]);

  const chipError = submitted && !isValidChipNumber(chipNumber) ? '15桁の数字で入力してください。' : undefined;
  const implantDateError = submitted && !isValidDateOrEmpty(implantDate) ? '日付の形式が正しくありません。' : undefined;
  const registrationDateError =
    submitted && !isValidDateOrEmpty(registrationDate) ? '日付の形式が正しくありません。' : undefined;

  const handleSave = async () => {
    setSubmitted(true);
    if (!isValidChipNumber(chipNumber) || !isValidDateOrEmpty(implantDate) || !isValidDateOrEmpty(registrationDate)) {
      return;
    }
    try {
      setSaving(true);
      await save((current) => ({
        ...current,
        microchip: {
          chipNumber,
          implantDate,
          registrationDate,
          implantClinic: implantClinic.trim(),
          memo: memo.trim(),
          updatedAt: new Date().toISOString(),
        },
      }));
      router.back();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('マイクロチップ情報を削除', 'この端末に保存したマイクロチップ情報を削除します。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          try {
            await save((current) => ({ ...current, microchip: null }));
            router.back();
          } catch (error) {
            setMessage(error instanceof Error ? error.message : '削除に失敗しました。');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SettingsPageScaffold
        title="マイクロチップ"
        subtitle="登録証明書を見ながら入力してください"
        theme={activeTheme}
        typography={typography}
        onBack={() => router.back()}>
        {status === 'unavailable' ? (
          <SettingsSection theme={activeTheme} typography={typography}>
            <Text style={[styles.message, { color: colors.text }]}>この機能は iPhone アプリでのみ利用できます。</Text>
          </SettingsSection>
        ) : (
          <>
            <SettingsSection theme={activeTheme} typography={typography} title="基本情報">
              <PetHealthField
                label="マイクロチップ番号（15桁）"
                value={chipNumber}
                onChangeText={(text) => setChipNumber(normalizeChipNumber(text))}
                keyboardType="number-pad"
                placeholder="392XXXXXXXXXXXX"
                maxLength={15}
                hint={`${chipNumber.length}/15桁`}
                error={chipError}
              />
              <PetHealthDateField
                label="装着日"
                value={implantDate}
                onChange={setImplantDate}
                error={implantDateError}
              />
              <PetHealthDateField
                label="登録日"
                value={registrationDate}
                onChange={setRegistrationDate}
                hint="登録証明書に記載の日付"
                error={registrationDateError}
              />
              <PetHealthField
                label="装着した動物病院"
                value={implantClinic}
                onChangeText={setImplantClinic}
                placeholder="〇〇動物病院"
                maxLength={80}
              />
              <PetHealthField
                label="メモ"
                value={memo}
                onChangeText={setMemo}
                placeholder="登録証明書の保管場所など"
                multiline
                maxLength={500}
              />
            </SettingsSection>

            <PetHealthButton label={saving ? '保存中...' : '保存する'} onPress={() => void handleSave()} disabled={saving || !hydrated} />
            {data.microchip ? <PetHealthButton label="マイクロチップ情報を削除" variant="danger" onPress={handleDelete} /> : null}
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

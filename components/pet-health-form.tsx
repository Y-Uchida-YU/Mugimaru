import { type ReactNode } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText as Text } from '@/components/themed-typography';
import { useAppTheme } from '@/lib/app-theme-context';
import { formatDateInput } from '@/lib/pet-health-store';

type FieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export function PetHealthField({ label, hint, error, trailing, multiline, ...inputProps }: FieldProps) {
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const fontFamily = typography.fontFamily;
  const scale = typography.scale;

  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.label, { color: colors.mutedText, fontFamily, fontSize: 12 * scale }]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...inputProps}
          multiline={multiline}
          placeholderTextColor={colors.mutedText}
          style={[
            styles.input,
            multiline && styles.multiline,
            {
              borderColor: error ? '#d6455d' : colors.border,
              backgroundColor: colors.background,
              color: colors.text,
              fontFamily,
              fontSize: 15 * scale,
            },
          ]}
        />
        {trailing}
      </View>
      {error ? (
        <Text style={[styles.hint, { color: '#d6455d', fontFamily, fontSize: 11 * scale }]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.mutedText, fontFamily, fontSize: 11 * scale }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
};

export function PetHealthDateField({ label, value, onChange, hint, error, trailing }: DateFieldProps) {
  return (
    <PetHealthField
      label={label}
      value={value}
      onChangeText={(text) => onChange(formatDateInput(text))}
      keyboardType="number-pad"
      placeholder="YYYY-MM-DD"
      maxLength={10}
      hint={hint ?? '例: 2026-04-01'}
      error={error}
      trailing={trailing}
    />
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  compact?: boolean;
};

export function PetHealthButton({ label, onPress, variant = 'primary', disabled, compact }: ButtonProps) {
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  const background =
    variant === 'primary' ? colors.accent : variant === 'danger' ? 'transparent' : colors.background;
  const textColor = variant === 'primary' ? colors.accentContrast : variant === 'danger' ? '#d6455d' : colors.text;
  const borderColor = variant === 'primary' ? colors.accent : variant === 'danger' ? '#d6455d' : colors.border;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        compact ? styles.compactButton : styles.button,
        { backgroundColor: background, borderColor, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: textColor, fontFamily: typography.fontFamily }]}>{label}</Text>
    </Pressable>
  );
}

type ChipOption<T extends string> = { id: T; label: string };

export function PetHealthChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const { activeTheme, typography } = useAppTheme();
  const colors = activeTheme.colors;
  return (
    <View style={styles.chipRow}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              {
                borderColor: selected ? colors.accent : colors.border,
                backgroundColor: selected ? colors.accent : colors.background,
              },
            ]}>
            <Text
              style={[
                styles.chipText,
                { color: selected ? colors.accentContrast : colors.text, fontFamily: typography.fontFamily },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 6 },
  label: { fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 9,
  },
  multiline: { minHeight: 84, textAlignVertical: 'top' },
  hint: { fontWeight: '600' },
  button: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  compactButton: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  buttonText: { fontSize: 14, fontWeight: '800' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 13, fontWeight: '700' },
});

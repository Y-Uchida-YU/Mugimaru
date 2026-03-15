import { forwardRef, useMemo, type ComponentRef } from 'react';
import {
  StyleSheet,
  Text as RNText,
  TextInput as RNTextInput,
  type TextInputProps,
  type TextProps,
  type TextStyle,
} from 'react-native';

import { useAppTheme } from '@/lib/app-theme-context';

function scaleTypographyStyle(style: TextStyle | undefined, scale: number, fontFamily: string | undefined) {
  if (!style) {
    return fontFamily ? { fontFamily } : undefined;
  }

  const nextStyle: TextStyle = { ...style };

  if (typeof nextStyle.fontSize === 'number') {
    nextStyle.fontSize *= scale;
  }

  if (typeof nextStyle.lineHeight === 'number') {
    nextStyle.lineHeight *= scale;
  }

  if (typeof nextStyle.letterSpacing === 'number') {
    nextStyle.letterSpacing *= scale;
  }

  if (!nextStyle.fontFamily && fontFamily) {
    nextStyle.fontFamily = fontFamily;
  }

  return nextStyle;
}

export const ThemedText = forwardRef<ComponentRef<typeof RNText>, TextProps>(function ThemedText(
  { style, ...props },
  ref
) {
  const { typography } = useAppTheme();

  const resolvedStyle = useMemo(
    () => scaleTypographyStyle(StyleSheet.flatten(style), typography.scale, typography.fontFamily),
    [style, typography.fontFamily, typography.scale]
  );

  return <RNText ref={ref} style={resolvedStyle} {...props} />;
});

export const ThemedTextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function ThemedTextInput(
  { style, ...props },
  ref
) {
  const { typography } = useAppTheme();

  const resolvedStyle = useMemo(
    () => scaleTypographyStyle(StyleSheet.flatten(style), typography.scale, typography.fontFamily),
    [style, typography.fontFamily, typography.scale]
  );

  return <RNTextInput ref={ref} style={resolvedStyle} {...props} />;
});

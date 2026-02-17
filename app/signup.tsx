import { useEffect, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';

import { Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { sendEmailVerificationCode, verifyEmailCode } from '@/lib/email-auth';
import { getAppText } from '@/lib/i18n';
import {
  authenticateWithApple,
  authenticateWithGoogle,
  authenticateWithLine,
  authenticateWithX,
} from '@/lib/social-auth';
import { hasSupabaseEnv } from '@/lib/supabase';
import { APP_SCHEME, buildAuthCallbackDeepLink } from '@/lib/app-link';

type SignupStep = 'method' | 'emailInput' | 'emailCode';
type SocialProvider = 'line' | 'google' | 'apple' | 'x';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_HERO_IMAGE = require('../assets/images/login-hero.png');

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type ProviderVisual = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  iconColor: string;
  iconCircleColor: string;
};

const PROVIDER_VISUALS: Record<'line' | 'google' | 'apple' | 'x' | 'email', ProviderVisual> = {
  line: {
    backgroundColor: '#06c755',
    borderColor: '#06c755',
    textColor: '#ffffff',
    iconColor: '#06c755',
    iconCircleColor: '#ffffff',
  },
  google: {
    backgroundColor: '#ffffff',
    borderColor: '#d6d6de',
    textColor: '#1f1f1f',
    iconColor: '#ea4335',
    iconCircleColor: '#ffffff',
  },
  apple: {
    backgroundColor: '#111111',
    borderColor: '#111111',
    textColor: '#ffffff',
    iconColor: '#111111',
    iconCircleColor: '#ffffff',
  },
  x: {
    backgroundColor: '#0f0f0f',
    borderColor: '#0f0f0f',
    textColor: '#ffffff',
    iconColor: '#0f0f0f',
    iconCircleColor: '#ffffff',
  },
  email: {
    backgroundColor: '#3b5ed8',
    borderColor: '#3b5ed8',
    textColor: '#ffffff',
    iconColor: '#3b5ed8',
    iconCircleColor: '#ffffff',
  },
};

function ProviderIcon({
  provider,
  color,
  size,
}: {
  provider: 'line' | 'google' | 'apple' | 'x' | 'email';
  color: string;
  size: number;
}) {
  if (provider === 'line') return <FontAwesome6 name="line" size={size} color={color} />;
  if (provider === 'google') return <FontAwesome6 name="google" size={size} color={color} />;
  if (provider === 'apple') return <FontAwesome6 name="apple" size={size} color={color} />;
  if (provider === 'x') return <FontAwesome6 name="x-twitter" size={size - 1} color={color} />;
  return <FontAwesome6 name="envelope" size={size - 1} color={color} />;
}

function formatSocialAuthError(provider: SocialProvider, error: unknown, localeGroup: string) {
  const raw = error instanceof Error ? error.message : 'Social login failed.';
  const lowered = raw.toLowerCase();

  if (provider !== 'line') {
    return raw;
  }

  if (/(cancelled|canceled|cancel)/i.test(raw)) {
    return localeGroup === 'japan'
      ? 'LINEログインをキャンセルしました。もう一度お試しください。'
      : 'LINE login was cancelled. Please try again.';
  }

  if (lowered.includes('invalid oauth state')) {
    return localeGroup === 'japan'
      ? 'LINEログインの状態確認に失敗しました。アプリを再起動して再度お試しください。'
      : 'LINE login state validation failed. Restart the app and try again.';
  }

  if (lowered.includes('redirect_uri')) {
    const redirect = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI ?? `${APP_SCHEME}://auth/callback`;
    return localeGroup === 'japan'
      ? `LINE認証のコールバックURLが一致していません。\nLINE DevelopersのCallback URLと .env の EXPO_PUBLIC_OAUTH_REDIRECT_URI を完全一致させてください。\n現在の設定: ${redirect}`
      : `LINE callback URL mismatch. Ensure LINE Developers callback URL exactly matches EXPO_PUBLIC_OAUTH_REDIRECT_URI in .env.\nCurrent setting: ${redirect}`;
  }

  return localeGroup === 'japan'
    ? `${raw}\n\nヒント: LINE DevelopersのCallback URL、Channel ID、.env設定を確認してください。`
    : `${raw}\n\nHint: Check LINE Developers callback URL, Channel ID, and .env values.`;
}

export default function SignupScreen() {
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const text = getAppText();
  const { isHydrated, isAuthenticated, loginAsGuest, loginWithEmail, loginWithSocial } = useAuth();

  const [step, setStep] = useState<SignupStep>('method');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const hasLineOAuth = Boolean(process.env.EXPO_PUBLIC_LINE_CHANNEL_ID);
  const hasGoogleOAuth = Boolean(process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID);
  const hasAppleOAuth = Boolean(
    process.env.EXPO_PUBLIC_APPLE_CLIENT_ID && process.env.EXPO_PUBLIC_APPLE_CLIENT_SECRET
  );
  const hasXOAuth = Boolean(process.env.EXPO_PUBLIC_X_CLIENT_ID);
  const emailIsValid = useMemo(() => EMAIL_PATTERN.test(email.trim()), [email]);
  const layout = useMemo(() => {
    const availableHeight = Math.max(560, windowHeight - insets.top - insets.bottom);
    const horizontalPadding = clamp(windowWidth * 0.055, 16, 28);
    const verticalPadding = clamp(availableHeight * 0.01, 8, 18);
    const topSectionGap = clamp(availableHeight * 0.01, 7, 14);
    const topSectionBottomPadding = clamp(availableHeight * 0.018, 10, 24);
    const topSectionHeight = Math.round(availableHeight * 0.5);
    const bottomSectionHeight = availableHeight - topSectionHeight;

    const heroHeight = clamp(availableHeight * 0.295, 175, 340);
    const brandSize = clamp(windowWidth * 0.098, 32, 44);
    const brandLineHeight = Math.round(brandSize * 1.04);
    const titleSize = clamp(windowWidth * 0.066, 22, 31);
    const captionSize = clamp(windowWidth * 0.034, 11, 14);

    const cardPadding = clamp(availableHeight * 0.013, 10, 18);
    const cardGap = clamp(availableHeight * 0.0075, 6, 10);
    const socialButtonHeight = clamp(availableHeight * 0.056, 40, 54);
    const iconCircleSize = clamp(socialButtonHeight * 0.58, 24, 32);
    const iconSize = clamp(iconCircleSize * 0.58, 14, 19);
    const socialButtonTextSize = clamp(windowWidth * 0.043, 14, 18);

    const guestTitleSize = clamp(windowWidth * 0.041, 14, 16);
    const guestNoteSize = clamp(windowWidth * 0.029, 10, 12);
    const loginTextSize = clamp(windowWidth * 0.032, 12, 14);
    const linkGap = clamp(windowWidth * 0.012, 5, 9);

    const inputFontSize = clamp(windowWidth * 0.036, 14, 16);
    const inputVerticalPadding = clamp(availableHeight * 0.012, 10, 13);
    const primaryButtonVerticalPadding = clamp(availableHeight * 0.013, 11, 14);

    return {
      availableHeight,
      topSectionHeight,
      bottomSectionHeight,
      horizontalPadding,
      verticalPadding,
      topSectionGap,
      topSectionBottomPadding,
      heroHeight,
      brandSize,
      brandLineHeight,
      titleSize,
      captionSize,
      cardPadding,
      cardGap,
      socialButtonHeight,
      iconCircleSize,
      iconSize,
      socialButtonTextSize,
      guestTitleSize,
      guestNoteSize,
      loginTextSize,
      linkGap,
      inputFontSize,
      inputVerticalPadding,
      primaryButtonVerticalPadding,
    };
  }, [insets.bottom, insets.top, windowHeight, windowWidth]);
  const centerShift = useMemo(() => {
    const topContentHeight =
      layout.heroHeight +
      layout.topSectionGap +
      layout.brandLineHeight +
      layout.titleSize +
      layout.captionSize +
      10;
    const topOffset = Math.max(
      0,
      layout.topSectionHeight - layout.topSectionBottomPadding - topContentHeight
    );

    let bottomContentHeight = 0;
    if (step === 'method') {
      const guestHeight =
        layout.inputVerticalPadding * 2 + layout.guestTitleSize + layout.guestNoteSize + 6;
      const loginRowHeight = layout.loginTextSize + 10;
      const methodItemCount = 7;
      bottomContentHeight =
        layout.cardPadding * 2 +
        layout.socialButtonHeight * 5 +
        guestHeight +
        loginRowHeight +
        layout.cardGap * (methodItemCount - 1);
    } else {
      const backHeight = layout.loginTextSize + 4;
      const stepTitleHeight = layout.titleSize * 0.72;
      const inputHeight = layout.inputVerticalPadding * 2 + layout.inputFontSize + 4;
      const primaryHeight = layout.primaryButtonVerticalPadding * 2 + layout.socialButtonTextSize;
      bottomContentHeight =
        layout.cardPadding * 2 +
        backHeight +
        stepTitleHeight +
        inputHeight +
        primaryHeight +
        layout.cardGap * 3;
    }

    const messageHeight = message ? layout.loginTextSize + 8 : 0;
    const bottomTotalHeight = bottomContentHeight + messageHeight;
    const bottomMargin = Math.max(0, (layout.bottomSectionHeight - bottomTotalHeight) / 2);

    const occupiedTop = topOffset;
    const occupiedBottom = layout.topSectionHeight + bottomMargin + bottomTotalHeight;
    const occupiedCenter = (occupiedTop + occupiedBottom) / 2;
    const targetCenter = layout.availableHeight / 2;

    return clamp(targetCenter - occupiedCenter, -28, 28);
  }, [layout, message, step]);

  const copy =
    text.localeGroup === 'japan'
      ? {
          chooseTitle: '\u4f1a\u54e1\u767b\u9332\u65b9\u6cd5\u3092\u9078\u629e',
          chooseCaption: '\u5229\u7528\u958b\u59cb\u306e\u65b9\u6cd5\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044',
          emailLabel: '\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3067\u767b\u9332',
          lineLabel: 'LINE\u3067\u767b\u9332',
          googleLabel: 'Google\u3067\u767b\u9332',
          appleLabel: 'Apple\u3067\u767b\u9332',
          xLabel: 'X\u3067\u767b\u9332',
          guestLabel: '\u4f1a\u54e1\u767b\u9332\u305b\u305a\u306b\u5229\u7528\u958b\u59cb',
          guestNote:
            '\u30b2\u30b9\u30c8\u306f\u4e00\u90e8\u6a5f\u80fd\u306b\u5236\u9650\u304c\u3042\u308a\u307e\u3059\u3002',
          hasAccount: '\u3059\u3067\u306b\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u304a\u6301\u3061\u3067\u3059\u304b\uff1f',
          loginLink: '\u30ed\u30b0\u30a4\u30f3',
          emailInputTitle: '\u30e1\u30fc\u30eb\u8a8d\u8a3c',
          emailCodeTitle: '\u8a8d\u8a3c\u30b3\u30fc\u30c9\u5165\u529b',
          emailPlaceholder: '\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9',
          codePlaceholder: '\u8a8d\u8a3c\u30b3\u30fc\u30c9',
          sendCode: '\u8a8d\u8a3c\u30b3\u30fc\u30c9\u3092\u9001\u4fe1',
          verifyCode: '\u8a8d\u8a3c\u3057\u3066\u7d9a\u884c',
          back: '\u623b\u308b',
          sentMessage: '\u8a8d\u8a3c\u30b3\u30fc\u30c9\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f\u3002',
          invalidEmail:
            '\u6709\u52b9\u306a\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
          missingCode:
            '\u8a8d\u8a3c\u30b3\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
          missingSupabase:
            '\u30e1\u30fc\u30eb\u8a8d\u8a3c\u306b\u306fSupabase\u306e\u8a2d\u5b9a\u304c\u5fc5\u8981\u3067\u3059\u3002',
          lineMissing: 'EXPO_PUBLIC_LINE_CHANNEL_ID \u304c\u672a\u8a2d\u5b9a\u3067\u3059\u3002',
          googleMissing: 'EXPO_PUBLIC_GOOGLE_CLIENT_ID \u304c\u672a\u8a2d\u5b9a\u3067\u3059\u3002',
          appleMissing:
            'EXPO_PUBLIC_APPLE_CLIENT_ID \u307e\u305f\u306f EXPO_PUBLIC_APPLE_CLIENT_SECRET \u304c\u672a\u8a2d\u5b9a\u3067\u3059\u3002',
          xMissing: 'EXPO_PUBLIC_X_CLIENT_ID \u304c\u672a\u8a2d\u5b9a\u3067\u3059\u3002',
        }
      : {
          chooseTitle: 'Choose a sign up method',
          chooseCaption: 'Select how you want to start using Mugimaru',
          emailLabel: 'Sign up with Email',
          lineLabel: 'Sign up with LINE',
          googleLabel: 'Sign up with Google',
          appleLabel: 'Sign up with Apple',
          xLabel: 'Sign up with X',
          guestLabel: 'Continue as guest',
          guestNote: 'Guest has limited features.',
          hasAccount: 'Already have an account?',
          loginLink: 'Log in',
          emailInputTitle: 'Email verification',
          emailCodeTitle: 'Enter verification code',
          emailPlaceholder: 'Email address',
          codePlaceholder: 'Verification code',
          sendCode: 'Send verification code',
          verifyCode: 'Verify and continue',
          back: 'Back',
          sentMessage: 'Verification code sent.',
          invalidEmail: 'Please enter a valid email address.',
          missingCode: 'Please enter the verification code.',
          missingSupabase: 'Supabase is not configured for email verification.',
          lineMissing: 'EXPO_PUBLIC_LINE_CHANNEL_ID is missing.',
          googleMissing: 'EXPO_PUBLIC_GOOGLE_CLIENT_ID is missing.',
          appleMissing:
            'EXPO_PUBLIC_APPLE_CLIENT_ID or EXPO_PUBLIC_APPLE_CLIENT_SECRET is missing.',
          xMissing: 'EXPO_PUBLIC_X_CLIENT_ID is missing.',
        };

  const onBackToMethod = () => {
    setStep('method');
    setMessage('');
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const code = typeof params.code === 'string' ? params.code : '';
    const state = typeof params.state === 'string' ? params.state : '';
    const error = typeof params.error === 'string' ? params.error : '';
    const errorDescription =
      typeof params.error_description === 'string' ? params.error_description : '';

    if (!code && !error) return;

    const query = new URLSearchParams();
    if (code) query.set('code', code);
    if (state) query.set('state', state);
    if (error) query.set('error', error);
    if (errorDescription) query.set('error_description', errorDescription);

    const fallbackDeepLink = buildAuthCallbackDeepLink(query);
    window.location.replace(fallbackDeepLink);
  }, [params.code, params.error, params.error_description, params.state]);

  const handleSendEmailCode = async () => {
    if (isBusy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setMessage(copy.invalidEmail);
      return;
    }

    if (!hasSupabaseEnv) {
      setMessage(copy.missingSupabase);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await sendEmailVerificationCode(normalizedEmail);
      setStep('emailCode');
      setMessage(copy.sentMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to send verification code.');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyEmailCode = async () => {
    if (isBusy) return;

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setMessage(copy.invalidEmail);
      return;
    }

    if (!emailCode.trim()) {
      setMessage(copy.missingCode);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const verified = await verifyEmailCode(normalizedEmail, emailCode);
      await loginWithEmail(verified.email, {
        externalId: verified.externalId,
        name: verified.name,
      });
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Email verification failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSocial = async (provider: SocialProvider) => {
    if (isBusy) return;

    if (provider === 'line' && !hasLineOAuth) {
      setMessage(copy.lineMissing);
      return;
    }

    if (provider === 'google' && !hasGoogleOAuth) {
      setMessage(copy.googleMissing);
      return;
    }

    if (provider === 'apple' && !hasAppleOAuth) {
      setMessage(copy.appleMissing);
      return;
    }

    if (provider === 'x' && !hasXOAuth) {
      setMessage(copy.xMissing);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const socialProfile =
        provider === 'line'
          ? await authenticateWithLine()
          : provider === 'google'
            ? await authenticateWithGoogle()
            : provider === 'apple'
              ? await authenticateWithApple()
              : await authenticateWithX();
      await loginWithSocial(provider, socialProfile);
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(formatSocialAuthError(provider, error, text.localeGroup));
    } finally {
      setBusy(false);
    }
  };

  const handleGuestLogin = async () => {
    if (isBusy) return;

    setBusy(true);
    setMessage('');
    try {
      await loginAsGuest();
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to start as guest.');
    } finally {
      setBusy(false);
    }
  };

  if (!isHydrated) {
    return null;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View
          style={[
            styles.content,
            {
              paddingHorizontal: layout.horizontalPadding,
              paddingTop: layout.verticalPadding,
              paddingBottom: layout.verticalPadding,
              transform: [{ translateY: centerShift }],
            },
          ]}>
          <View
            style={[
              styles.topSection,
              {
                height: layout.topSectionHeight,
                paddingBottom: layout.topSectionBottomPadding,
                gap: layout.topSectionGap,
              },
            ]}>
            <Image
              source={LOGIN_HERO_IMAGE}
              style={[styles.heroImage, { height: layout.heroHeight }]}
              resizeMode="contain"
            />

            <View style={styles.logoBlock}>
              <Text style={[styles.brand, { fontSize: layout.brandSize, lineHeight: layout.brandLineHeight }]}>
                Mugimaru
              </Text>
              <Text style={[styles.heroTitle, { fontSize: layout.titleSize }]}>{copy.chooseTitle}</Text>
              <Text style={[styles.heroCaption, { fontSize: layout.captionSize }]}>{copy.chooseCaption}</Text>
            </View>
          </View>

          <View style={[styles.bottomSection, { height: layout.bottomSectionHeight }]}>
            {step === 'method' ? (
              <View style={[styles.methodCard, { padding: layout.cardPadding, gap: layout.cardGap }]}>
              <Pressable
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: PROVIDER_VISUALS.line.backgroundColor,
                    borderColor: PROVIDER_VISUALS.line.borderColor,
                    minHeight: layout.socialButtonHeight,
                  },
                ]}
                onPress={() => void handleSocial('line')}
                disabled={isBusy}>
                <View
                  style={[
                    styles.socialIconCircle,
                    {
                      backgroundColor: PROVIDER_VISUALS.line.iconCircleColor,
                      width: layout.iconCircleSize,
                      height: layout.iconCircleSize,
                      borderRadius: layout.iconCircleSize / 2,
                      left: layout.cardPadding + 2,
                    },
                  ]}>
                  <ProviderIcon
                    provider="line"
                    color={PROVIDER_VISUALS.line.iconColor}
                    size={layout.iconSize}
                  />
                </View>
                <Text
                  style={[
                    styles.socialButtonText,
                    { color: PROVIDER_VISUALS.line.textColor, fontSize: layout.socialButtonTextSize },
                  ]}>
                  {copy.lineLabel}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: PROVIDER_VISUALS.google.backgroundColor,
                    borderColor: PROVIDER_VISUALS.google.borderColor,
                    minHeight: layout.socialButtonHeight,
                  },
                ]}
                onPress={() => void handleSocial('google')}
                disabled={isBusy}>
                <View
                  style={[
                    styles.socialIconCircle,
                    {
                      backgroundColor: PROVIDER_VISUALS.google.iconCircleColor,
                      width: layout.iconCircleSize,
                      height: layout.iconCircleSize,
                      borderRadius: layout.iconCircleSize / 2,
                      left: layout.cardPadding + 2,
                    },
                  ]}>
                  <ProviderIcon
                    provider="google"
                    color={PROVIDER_VISUALS.google.iconColor}
                    size={layout.iconSize}
                  />
                </View>
                <Text
                  style={[
                    styles.socialButtonText,
                    { color: PROVIDER_VISUALS.google.textColor, fontSize: layout.socialButtonTextSize },
                  ]}>
                  {copy.googleLabel}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: PROVIDER_VISUALS.apple.backgroundColor,
                    borderColor: PROVIDER_VISUALS.apple.borderColor,
                    minHeight: layout.socialButtonHeight,
                  },
                ]}
                onPress={() => void handleSocial('apple')}
                disabled={isBusy}>
                <View
                  style={[
                    styles.socialIconCircle,
                    {
                      backgroundColor: PROVIDER_VISUALS.apple.iconCircleColor,
                      width: layout.iconCircleSize,
                      height: layout.iconCircleSize,
                      borderRadius: layout.iconCircleSize / 2,
                      left: layout.cardPadding + 2,
                    },
                  ]}>
                  <ProviderIcon
                    provider="apple"
                    color={PROVIDER_VISUALS.apple.iconColor}
                    size={layout.iconSize}
                  />
                </View>
                <Text
                  style={[
                    styles.socialButtonText,
                    { color: PROVIDER_VISUALS.apple.textColor, fontSize: layout.socialButtonTextSize },
                  ]}>
                  {copy.appleLabel}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: PROVIDER_VISUALS.x.backgroundColor,
                    borderColor: PROVIDER_VISUALS.x.borderColor,
                    minHeight: layout.socialButtonHeight,
                  },
                ]}
                onPress={() => void handleSocial('x')}
                disabled={isBusy}>
                <View
                  style={[
                    styles.socialIconCircle,
                    {
                      backgroundColor: PROVIDER_VISUALS.x.iconCircleColor,
                      width: layout.iconCircleSize,
                      height: layout.iconCircleSize,
                      borderRadius: layout.iconCircleSize / 2,
                      left: layout.cardPadding + 2,
                    },
                  ]}>
                  <ProviderIcon provider="x" color={PROVIDER_VISUALS.x.iconColor} size={layout.iconSize} />
                </View>
                <Text
                  style={[
                    styles.socialButtonText,
                    { color: PROVIDER_VISUALS.x.textColor, fontSize: layout.socialButtonTextSize },
                  ]}>
                  {copy.xLabel}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.socialButton,
                  {
                    backgroundColor: PROVIDER_VISUALS.email.backgroundColor,
                    borderColor: PROVIDER_VISUALS.email.borderColor,
                    minHeight: layout.socialButtonHeight,
                  },
                ]}
                onPress={() => setStep('emailInput')}
                disabled={isBusy}>
                <View
                  style={[
                    styles.socialIconCircle,
                    {
                      backgroundColor: PROVIDER_VISUALS.email.iconCircleColor,
                      width: layout.iconCircleSize,
                      height: layout.iconCircleSize,
                      borderRadius: layout.iconCircleSize / 2,
                      left: layout.cardPadding + 2,
                    },
                  ]}>
                  <ProviderIcon
                    provider="email"
                    color={PROVIDER_VISUALS.email.iconColor}
                    size={layout.iconSize}
                  />
                </View>
                <Text
                  style={[
                    styles.socialButtonText,
                    { color: PROVIDER_VISUALS.email.textColor, fontSize: layout.socialButtonTextSize },
                  ]}>
                  {copy.emailLabel}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.methodButton,
                  styles.guestButton,
                  { paddingVertical: layout.inputVerticalPadding },
                ]}
                onPress={() => void handleGuestLogin()}
                disabled={isBusy}>
                <View style={styles.guestButtonBody}>
                  <Text style={[styles.guestButtonText, { fontSize: layout.guestTitleSize }]}>
                    {copy.guestLabel}
                  </Text>
                  <Text style={[styles.guestInlineNote, { fontSize: layout.guestNoteSize }]}>
                    {copy.guestNote}
                  </Text>
                </View>
              </Pressable>
              <View style={[styles.loginRow, { gap: layout.linkGap }]}>
                <Text style={[styles.loginPrompt, { fontSize: layout.loginTextSize }]}>{copy.hasAccount}</Text>
                <Pressable onPress={() => router.push('/login')} disabled={isBusy}>
                  <Text style={[styles.loginLink, { fontSize: layout.loginTextSize }]}>{copy.loginLink}</Text>
                </Pressable>
              </View>
              </View>
            ) : null}

            {step === 'emailInput' ? (
              <View style={[styles.stepCard, { padding: layout.cardPadding }]}>
              <Pressable onPress={onBackToMethod}>
                <Text style={[styles.backText, { fontSize: layout.loginTextSize }]}>{copy.back}</Text>
              </Pressable>
              <Text style={[styles.stepTitle, { fontSize: layout.titleSize * 0.72 }]}>
                {copy.emailInputTitle}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { fontSize: layout.inputFontSize, paddingVertical: layout.inputVerticalPadding },
                ]}
                placeholder={copy.emailPlaceholder}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
                editable={!isBusy}
              />
              <Pressable
                style={[styles.primaryButton, !emailIsValid || isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleSendEmailCode()}
                disabled={!emailIsValid || isBusy}>
                <Text
                  style={[
                    styles.primaryButtonText,
                    { fontSize: layout.socialButtonTextSize - 1, paddingVertical: layout.primaryButtonVerticalPadding },
                  ]}>
                  {copy.sendCode}
                </Text>
              </Pressable>
              </View>
            ) : null}

            {step === 'emailCode' ? (
              <View style={[styles.stepCard, { padding: layout.cardPadding }]}>
              <Pressable onPress={onBackToMethod}>
                <Text style={[styles.backText, { fontSize: layout.loginTextSize }]}>{copy.back}</Text>
              </Pressable>
              <Text style={[styles.stepTitle, { fontSize: layout.titleSize * 0.72 }]}>{copy.emailCodeTitle}</Text>
              <TextInput
                style={[
                  styles.input,
                  { fontSize: layout.inputFontSize, paddingVertical: layout.inputVerticalPadding },
                ]}
                placeholder={copy.codePlaceholder}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                value={emailCode}
                onChangeText={setEmailCode}
                editable={!isBusy}
              />
              <Pressable
                style={[styles.primaryButton, isBusy ? styles.buttonDisabled : null]}
                onPress={() => void handleVerifyEmailCode()}
                disabled={isBusy}>
                <Text
                  style={[
                    styles.primaryButtonText,
                    { fontSize: layout.socialButtonTextSize - 1, paddingVertical: layout.primaryButtonVerticalPadding },
                  ]}>
                  {copy.verifyCode}
                </Text>
              </Pressable>
              </View>
            ) : null}

            {message ? <Text style={[styles.message, { fontSize: layout.loginTextSize }]}>{message}</Text> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f2e8',
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  topSection: {
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bottomSection: {
    justifyContent: 'center',
    gap: 6,
  },
  logoBlock: {
    alignItems: 'center',
    paddingTop: 2,
    gap: 4,
  },
  brand: {
    color: '#5a3f27',
    fontFamily: Fonts.rounded,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 36,
    marginBottom: 0,
    textShadowColor: 'rgba(255, 255, 255, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  heroTitle: {
    fontFamily: Fonts.rounded,
    color: '#4b3a2a',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroCaption: {
    color: '#7f694f',
    fontSize: 12,
    textAlign: 'center',
  },
  heroImage: {
    width: '100%',
    height: 125,
    alignSelf: 'center',
  },
  methodCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddccb5',
    padding: 10,
    gap: 7,
  },
  socialButton: {
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  socialIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    left: 12,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
  methodButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dccab2',
    backgroundColor: '#ffffff',
    paddingVertical: 10,
    alignItems: 'center',
  },
  methodButtonText: {
    color: '#4d3b2b',
    fontSize: 15,
    fontWeight: '700',
  },
  guestButton: {
    backgroundColor: '#f4eadb',
  },
  guestButtonText: {
    color: '#6a543c',
    fontSize: 14,
    fontWeight: '700',
  },
  guestButtonBody: {
    alignItems: 'center',
    gap: 2,
  },
  guestInlineNote: {
    color: '#8a7459',
    fontSize: 10,
  },
  loginRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  loginPrompt: {
    color: '#8a7459',
    fontSize: 12,
  },
  loginLink: {
    color: '#5a3f27',
    fontSize: 12,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  stepCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddccb5',
    padding: 12,
    gap: 10,
  },
  backText: {
    color: '#8a7459',
    fontSize: 13,
    fontWeight: '700',
  },
  stepTitle: {
    color: '#4d3b2b',
    fontSize: 18,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddccb5',
    borderRadius: 10,
    backgroundColor: '#fffdf8',
    paddingHorizontal: 11,
    paddingVertical: 10,
    fontSize: 14,
    color: '#4f3b29',
  },
  primaryButton: {
    borderRadius: 10,
    backgroundColor: '#b89062',
    alignItems: 'center',
    paddingVertical: 11,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  message: {
    color: '#6f583f',
    fontSize: 12,
    textAlign: 'center',
  },
});

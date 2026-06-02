import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import { Fonts } from '@/constants/theme';
import { APP_SCHEME, buildAuthCallbackDeepLink } from '@/lib/app-link';
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

type SignupStep = 'method' | 'email' | 'code';
type SocialProvider = 'line' | 'google' | 'apple' | 'x';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HERO_IMAGE = require('../assets/images/login-hero.jpg');

function ProviderIcon({ provider, color }: { provider: SocialProvider | 'email' | 'guest'; color: string }) {
  const icon =
    provider === 'line'
      ? 'line'
      : provider === 'google'
        ? 'google'
        : provider === 'apple'
          ? 'apple'
          : provider === 'x'
            ? 'x-twitter'
            : provider === 'email'
              ? 'envelope'
              : 'user';
  return <FontAwesome6 name={icon} size={16} color={color} />;
}

function formatSocialAuthError(provider: SocialProvider, error: unknown, localeGroup: string) {
  const raw = error instanceof Error ? error.message : 'Social login failed.';
  const redirect = process.env.EXPO_PUBLIC_OAUTH_REDIRECT_URI ?? `${APP_SCHEME}://auth/callback`;
  if (provider === 'line' && raw.toLowerCase().includes('redirect_uri')) {
    return localeGroup === 'japan'
      ? `LINEのCallback URLを確認してください。現在の設定: ${redirect}`
      : `Check the LINE callback URL. Current setting: ${redirect}`;
  }
  return raw;
}

export default function SignupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    state?: string;
    error?: string;
    error_description?: string;
  }>();
  const text = getAppText();
  const { isHydrated, isAuthenticated, loginAsGuest, loginWithEmail, loginWithSocial } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

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

  const copy =
    text.localeGroup === 'japan'
      ? {
          eyebrow: 'Start with Mugimaru',
          title: '犬との毎日を、もっと軽やかに',
          caption: 'おすすめスポット、イベント、コミュニティをあなた向けに整理します。',
          line: 'LINEで続ける',
          google: 'Googleで続ける',
          apple: 'Appleで続ける',
          x: 'Xで続ける',
          email: 'メール認証で続ける',
          guest: 'ゲストで試す',
          guestNote: '一部機能はログイン後に利用できます',
          hasAccount: 'すでにアカウントをお持ちですか？',
          login: 'ログイン',
          emailTitle: 'メールアドレスを入力',
          codeTitle: '認証コードを入力',
          emailPlaceholder: 'メールアドレス',
          codePlaceholder: '認証コード',
          sendCode: 'コードを送信',
          verifyCode: '認証して開始',
          back: '戻る',
          sent: '認証コードを送信しました。',
          invalidEmail: '有効なメールアドレスを入力してください。',
          missingCode: '認証コードを入力してください。',
          missingSupabase: 'メール認証にはSupabase設定が必要です。',
          missing: (provider: string) => `${provider}ログインの環境変数が未設定です。`,
          recommendTitle: 'おすすめ機能',
          recommendBody: '登録後、近くのイベント・人気の投稿・保存スポットをホームで提案します。',
        }
      : {
          eyebrow: 'Start with Mugimaru',
          title: 'Make dog life easier',
          caption: 'Personalized spots, events, and community updates in one place.',
          line: 'Continue with LINE',
          google: 'Continue with Google',
          apple: 'Continue with Apple',
          x: 'Continue with X',
          email: 'Continue with email',
          guest: 'Try as guest',
          guestNote: 'Some features unlock after sign in',
          hasAccount: 'Already have an account?',
          login: 'Log in',
          emailTitle: 'Enter your email',
          codeTitle: 'Enter verification code',
          emailPlaceholder: 'Email address',
          codePlaceholder: 'Verification code',
          sendCode: 'Send code',
          verifyCode: 'Verify and start',
          back: 'Back',
          sent: 'Verification code sent.',
          invalidEmail: 'Please enter a valid email address.',
          missingCode: 'Please enter the verification code.',
          missingSupabase: 'Supabase is required for email verification.',
          missing: (provider: string) => `${provider} OAuth is not configured.`,
          recommendTitle: 'Recommended for you',
          recommendBody: 'After signup, the app suggests nearby events, trending posts, and saved spots.',
        };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 560, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 16, stiffness: 120, useNativeDriver: true }),
    ]).start();
  }, [fade, scale]);

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
    window.location.replace(buildAuthCallbackDeepLink(query));
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
      setStep('code');
      setMessage(copy.sent);
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
    if (provider === 'line' && !hasLineOAuth) return setMessage(copy.missing('LINE'));
    if (provider === 'google' && !hasGoogleOAuth) return setMessage(copy.missing('Google'));
    if (provider === 'apple' && !hasAppleOAuth) return setMessage(copy.missing('Apple'));
    if (provider === 'x' && !hasXOAuth) return setMessage(copy.missing('X'));

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

  if (!isHydrated) return null;
  if (isAuthenticated) return <Redirect href="/(tabs)" />;

  return (
    <ImageBackground source={HERO_IMAGE} style={styles.background} resizeMode="cover">
      <View style={styles.scrim} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.heroPanel, { opacity: fade, transform: [{ scale }] }]}>
              <View style={styles.logoRow}>
                <View style={styles.logoMark}>
                  <FontAwesome6 name="paw" size={18} color="#0f172a" />
                </View>
                <Text style={styles.brand}>Mugimaru</Text>
              </View>
              <Text style={styles.eyebrow}>{copy.eyebrow}</Text>
              <Text style={styles.title}>{copy.title}</Text>
              <Text style={styles.caption}>{copy.caption}</Text>
              <View style={styles.recommendCard}>
                <FontAwesome6 name="wand-magic-sparkles" size={15} color="#2563eb" />
                <View style={styles.recommendTextWrap}>
                  <Text style={styles.recommendTitle}>{copy.recommendTitle}</Text>
                  <Text style={styles.recommendBody}>{copy.recommendBody}</Text>
                </View>
              </View>
            </Animated.View>

            <View style={styles.methodPanel}>
              {step === 'method' ? (
                <>
                  <ProviderButton label={copy.line} provider="line" onPress={() => void handleSocial('line')} disabled={isBusy} tone="line" />
                  <ProviderButton label={copy.google} provider="google" onPress={() => void handleSocial('google')} disabled={isBusy} tone="light" />
                  <ProviderButton label={copy.apple} provider="apple" onPress={() => void handleSocial('apple')} disabled={isBusy} tone="dark" />
                  <ProviderButton label={copy.x} provider="x" onPress={() => void handleSocial('x')} disabled={isBusy} tone="dark" />
                  <ProviderButton label={copy.email} provider="email" onPress={() => setStep('email')} disabled={isBusy} tone="blue" />
                  <Pressable style={styles.guestButton} onPress={() => void handleGuestLogin()} disabled={isBusy}>
                    <ProviderIcon provider="guest" color="#475569" />
                    <View style={styles.guestTextWrap}>
                      <Text style={styles.guestTitle}>{copy.guest}</Text>
                      <Text style={styles.guestNote}>{copy.guestNote}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.loginRow}>
                    <Text style={styles.loginPrompt}>{copy.hasAccount}</Text>
                    <Pressable onPress={() => router.push('/login')} disabled={isBusy}>
                      <Text style={styles.loginLink}>{copy.login}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Pressable
                    style={styles.backButton}
                    onPress={() => {
                      setStep('method');
                      setMessage('');
                    }}>
                    <FontAwesome6 name="arrow-left" size={13} color="#2563eb" />
                    <Text style={styles.backText}>{copy.back}</Text>
                  </Pressable>
                  <Text style={styles.stepTitle}>{step === 'email' ? copy.emailTitle : copy.codeTitle}</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={step === 'email' ? copy.emailPlaceholder : copy.codePlaceholder}
                    placeholderTextColor="#94a3b8"
                    keyboardType={step === 'email' ? 'email-address' : 'number-pad'}
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={step === 'email' ? email : emailCode}
                    onChangeText={step === 'email' ? setEmail : setEmailCode}
                    editable={!isBusy}
                  />
                  <Pressable
                    style={[styles.primaryButton, (step === 'email' && !emailIsValid) || isBusy ? styles.disabled : null]}
                    onPress={() => (step === 'email' ? void handleSendEmailCode() : void handleVerifyEmailCode())}
                    disabled={(step === 'email' && !emailIsValid) || isBusy}>
                    <Text style={styles.primaryButtonText}>{step === 'email' ? copy.sendCode : copy.verifyCode}</Text>
                  </Pressable>
                </>
              )}
              {message ? <Text style={styles.message}>{message}</Text> : null}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

function ProviderButton({
  label,
  provider,
  tone,
  onPress,
  disabled,
}: {
  label: string;
  provider: SocialProvider | 'email';
  tone: 'line' | 'light' | 'dark' | 'blue';
  onPress: () => void;
  disabled: boolean;
}) {
  const isLight = tone === 'light';
  const backgroundColor =
    tone === 'line' ? '#06c755' : tone === 'dark' ? '#0f172a' : tone === 'blue' ? '#2563eb' : '#ffffff';
  const color = isLight ? '#0f172a' : '#ffffff';
  return (
    <Pressable
      style={[styles.providerButton, { backgroundColor, borderColor: isLight ? '#cbd5e1' : backgroundColor }, disabled ? styles.disabled : null]}
      onPress={onPress}
      disabled={disabled}>
      <ProviderIcon provider={provider} color={color} />
      <Text style={[styles.providerButtonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#eef2ff' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(248, 250, 252, 0.72)' },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'flex-end', padding: 18, gap: 12 },
  heroPanel: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    borderRadius: 28,
    padding: 20,
    gap: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.32)',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  brand: { color: '#0f172a', fontFamily: Fonts.rounded, fontSize: 22, fontWeight: '800' },
  eyebrow: { color: '#2563eb', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: '#0f172a', fontFamily: Fonts.rounded, fontSize: 33, fontWeight: '800', lineHeight: 39 },
  caption: { color: '#475569', fontSize: 14, lineHeight: 21 },
  recommendCard: {
    marginTop: 2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  recommendTextWrap: { flex: 1, gap: 2 },
  recommendTitle: { color: '#1e3a8a', fontSize: 12, fontWeight: '800' },
  recommendBody: { color: '#334155', fontSize: 12, lineHeight: 18 },
  methodPanel: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    borderRadius: 28,
    padding: 14,
    gap: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.34)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 9,
  },
  providerButton: {
    minHeight: 50,
    borderRadius: 17,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  providerButtonText: { fontSize: 14, fontWeight: '800' },
  guestButton: {
    minHeight: 56,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestTextWrap: { flex: 1, gap: 1 },
  guestTitle: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  guestNote: { color: '#64748b', fontSize: 11 },
  loginRow: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  loginPrompt: { color: '#64748b', fontSize: 12, fontWeight: '700' },
  loginLink: { color: '#2563eb', fontSize: 12, fontWeight: '800' },
  backButton: { alignSelf: 'flex-start', minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 7 },
  backText: { color: '#2563eb', fontSize: 13, fontWeight: '800' },
  stepTitle: { color: '#0f172a', fontSize: 20, fontWeight: '800' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 16,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    color: '#0f172a',
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 50,
    borderRadius: 17,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.58 },
  message: { color: '#b42318', fontSize: 12, lineHeight: 18, textAlign: 'center' },
});

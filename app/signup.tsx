import { useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';

import { Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { sendEmailVerificationCode, verifyEmailCode } from '@/lib/email-auth';
import { getAppText } from '@/lib/i18n';
import { authenticateWithLine, authenticateWithX } from '@/lib/social-auth';
import { hasSupabaseEnv } from '@/lib/supabase';

type SignupStep = 'method' | 'emailInput' | 'emailCode';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGIN_HERO_IMAGE = require('../assets/images/login-hero.png');

export default function SignupScreen() {
  const router = useRouter();
  const text = getAppText();
  const { isHydrated, isAuthenticated, loginAsGuest, loginWithEmail, loginWithSocial } = useAuth();

  const [step, setStep] = useState<SignupStep>('method');
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const hasLineOAuth = Boolean(process.env.EXPO_PUBLIC_LINE_CHANNEL_ID);
  const hasXOAuth = Boolean(process.env.EXPO_PUBLIC_X_CLIENT_ID);
  const emailIsValid = useMemo(() => EMAIL_PATTERN.test(email.trim()), [email]);

  const copy =
    text.localeGroup === 'japan'
      ? {
          chooseTitle: '\u4f1a\u54e1\u767b\u9332\u65b9\u6cd5\u3092\u9078\u629e',
          chooseCaption: '\u5229\u7528\u958b\u59cb\u306e\u65b9\u6cd5\u3092\u9078\u3093\u3067\u304f\u3060\u3055\u3044',
          emailLabel: '\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3067\u8a8d\u8a3c',
          lineLabel: 'LINE\u3067\u8a8d\u8a3c',
          xLabel: 'X\u3067\u8a8d\u8a3c',
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
          xMissing: 'EXPO_PUBLIC_X_CLIENT_ID \u304c\u672a\u8a2d\u5b9a\u3067\u3059\u3002',
        }
      : {
          chooseTitle: 'Choose a sign up method',
          chooseCaption: 'Select how you want to start using Mugimaru',
          emailLabel: 'Continue with Email',
          lineLabel: 'Continue with LINE',
          xLabel: 'Continue with X',
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
          xMissing: 'EXPO_PUBLIC_X_CLIENT_ID is missing.',
        };

  const onBackToMethod = () => {
    setStep('method');
    setMessage('');
  };

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

  const handleSocial = async (provider: 'line' | 'x') => {
    if (isBusy) return;

    if (provider === 'line' && !hasLineOAuth) {
      setMessage(copy.lineMissing);
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
        provider === 'line' ? await authenticateWithLine() : await authenticateWithX();
      await loginWithSocial(provider, socialProfile);
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Social login failed.');
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
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={LOGIN_HERO_IMAGE} style={styles.heroImage} resizeMode="contain" />

          <View style={styles.logoBlock}>
            <Text style={styles.brand}>Mugimaru</Text>
            <Text style={styles.heroTitle}>{copy.chooseTitle}</Text>
            <Text style={styles.heroCaption}>{copy.chooseCaption}</Text>
          </View>

          {step === 'method' ? (
            <View style={styles.methodCard}>
              <Pressable style={styles.methodButton} onPress={() => setStep('emailInput')} disabled={isBusy}>
                <Text style={styles.methodButtonText}>{copy.emailLabel}</Text>
              </Pressable>
              <Pressable style={styles.methodButton} onPress={() => void handleSocial('line')} disabled={isBusy}>
                <Text style={styles.methodButtonText}>{copy.lineLabel}</Text>
              </Pressable>
              <Pressable style={styles.methodButton} onPress={() => void handleSocial('x')} disabled={isBusy}>
                <Text style={styles.methodButtonText}>{copy.xLabel}</Text>
              </Pressable>
              <Pressable
                style={[styles.methodButton, styles.guestButton]}
                onPress={() => void handleGuestLogin()}
                disabled={isBusy}>
                <View style={styles.guestButtonBody}>
                  <Text style={styles.guestButtonText}>{copy.guestLabel}</Text>
                  <Text style={styles.guestInlineNote}>{copy.guestNote}</Text>
                </View>
              </Pressable>
              <View style={styles.loginRow}>
                <Text style={styles.loginPrompt}>{copy.hasAccount}</Text>
                <Pressable onPress={() => router.push('/login')} disabled={isBusy}>
                  <Text style={styles.loginLink}>{copy.loginLink}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {step === 'emailInput' ? (
            <View style={styles.stepCard}>
              <Pressable onPress={onBackToMethod}>
                <Text style={styles.backText}>{copy.back}</Text>
              </Pressable>
              <Text style={styles.stepTitle}>{copy.emailInputTitle}</Text>
              <TextInput
                style={styles.input}
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
                <Text style={styles.primaryButtonText}>{copy.sendCode}</Text>
              </Pressable>
            </View>
          ) : null}

          {step === 'emailCode' ? (
            <View style={styles.stepCard}>
              <Pressable onPress={onBackToMethod}>
                <Text style={styles.backText}>{copy.back}</Text>
              </Pressable>
              <Text style={styles.stepTitle}>{copy.emailCodeTitle}</Text>
              <TextInput
                style={styles.input}
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
                <Text style={styles.primaryButtonText}>{copy.verifyCode}</Text>
              </Pressable>
            </View>
          ) : null}

          {message ? <Text style={styles.message}>{message}</Text> : null}
        </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 14,
  },
  logoBlock: {
    alignItems: 'center',
    paddingTop: 2,
    gap: 8,
  },
  brand: {
    color: '#5a3f27',
    fontFamily: Fonts.rounded,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 42,
    marginBottom: 4,
    textShadowColor: 'rgba(255, 255, 255, 0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  heroTitle: {
    fontFamily: Fonts.rounded,
    color: '#4b3a2a',
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroCaption: {
    color: '#7f694f',
    fontSize: 13,
    textAlign: 'center',
  },
  heroImage: {
    width: '100%',
    height: 250,
    alignSelf: 'center',
  },
  methodCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddccb5',
    padding: 14,
    gap: 10,
  },
  methodButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dccab2',
    backgroundColor: '#ffffff',
    paddingVertical: 13,
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
    fontSize: 15,
    fontWeight: '700',
  },
  guestButtonBody: {
    alignItems: 'center',
    gap: 2,
  },
  guestInlineNote: {
    color: '#8a7459',
    fontSize: 11,
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
    padding: 14,
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
  },
});

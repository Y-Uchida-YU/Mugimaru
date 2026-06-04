import { useEffect, useRef, useState } from 'react';
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
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText as Text, ThemedTextInput as TextInput } from '@/components/themed-typography';
import { useAuth } from '@/lib/auth-context';
import { getAppText } from '@/lib/i18n';
import { authenticateWithApple } from '@/lib/social-auth';

const HERO_IMAGE = require('../assets/images/login-hero.jpg');

export default function LoginScreen() {
  const router = useRouter();
  const text = getAppText();
  const { isHydrated, isAuthenticated, loginWithPassword, loginWithSocial } = useAuth();
  const fade = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(16)).current;

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const copy =
    text.localeGroup === 'japan'
      ? {
          idLabel: 'ID / メール',
          idPlaceholder: 'ID またはメールアドレス',
          passwordLabel: 'パスワード',
          passwordPlaceholder: 'パスワード',
          loginAction: 'ログイン',
          appleLoginAction: 'Appleで続ける',
          signup: '新しく始める',
          missingId: 'IDまたはメールアドレスを入力してください。',
          missingPassword: 'パスワードを入力してください。',
        }
      : {
          idLabel: 'ID / Email',
          idPlaceholder: 'ID or email address',
          passwordLabel: 'Password',
          passwordPlaceholder: 'Password',
          loginAction: 'Log in',
          appleLoginAction: 'Continue with Apple',
          signup: 'Start fresh',
          missingId: 'Please enter your ID or email.',
          missingPassword: 'Please enter your password.',
        };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 520, useNativeDriver: true }),
      Animated.spring(lift, { toValue: 0, damping: 18, stiffness: 110, useNativeDriver: true }),
    ]).start();
  }, [fade, lift]);

  const handleLogin = async () => {
    if (isBusy) return;
    const normalizedCredential = credential.trim();
    const normalizedPassword = password.trim();
    if (!normalizedCredential) {
      setMessage(copy.missingId);
      return;
    }
    if (!normalizedPassword) {
      setMessage(copy.missingPassword);
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      await loginWithPassword(normalizedCredential, normalizedPassword);
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'ログインに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const handleAppleLogin = async () => {
    if (isBusy) return;

    setBusy(true);
    setMessage('');
    try {
      const socialProfile = await authenticateWithApple();
      await loginWithSocial('apple', socialProfile);
      router.replace('/(tabs)');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Appleログインに失敗しました。');
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
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.panel, { opacity: fade, transform: [{ translateY: lift }] }]}>
              <View style={styles.form}>
                <Text style={styles.label}>{copy.idLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={credential}
                  onChangeText={setCredential}
                  placeholder={copy.idPlaceholder}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.label}>{copy.passwordLabel}</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={copy.passwordPlaceholder}
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <Pressable
                style={[styles.primaryButton, isBusy ? styles.disabled : null]}
                onPress={() => void handleLogin()}
                disabled={isBusy}>
                <Text style={styles.primaryButtonText}>{copy.loginAction}</Text>
                <FontAwesome6 name="arrow-right" size={14} color="#ffffff" />
              </Pressable>

              <Pressable
                style={[styles.appleButton, isBusy ? styles.disabled : null]}
                onPress={() => void handleAppleLogin()}
                disabled={isBusy}>
                <FontAwesome6 name="apple" size={16} color="#0f172a" />
                <Text style={styles.appleButtonText}>{copy.appleLoginAction}</Text>
              </Pressable>

              <Pressable style={styles.signupLink} onPress={() => router.replace('/signup')} disabled={isBusy}>
                <Text style={styles.signupLinkText}>{copy.signup}</Text>
              </Pressable>

              {message ? <Text style={styles.message}>{message}</Text> : null}
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#eaf2ff' },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(248, 250, 252, 0.76)',
  },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    padding: 18,
  },
  panel: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.34)',
    padding: 20,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  form: { gap: 8 },
  label: { color: '#334155', fontSize: 12, fontWeight: '800' },
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
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  disabled: { opacity: 0.58 },
  primaryButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  appleButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  appleButtonText: { color: '#0f172a', fontSize: 14, fontWeight: '800' },
  signupLink: { minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  signupLinkText: { color: '#2563eb', fontSize: 13, fontWeight: '800' },
  message: { color: '#b42318', fontSize: 12, lineHeight: 18 },
});

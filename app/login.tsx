import { useState } from 'react';
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
import { Redirect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts } from '@/constants/theme';
import { useAuth } from '@/lib/auth-context';
import { getAppText } from '@/lib/i18n';

const LOGIN_HERO_IMAGE = require('../assets/images/login-hero.png');

export default function LoginScreen() {
  const router = useRouter();
  const text = getAppText();
  const { isHydrated, isAuthenticated, loginWithPassword } = useAuth();

  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const copy =
    text.localeGroup === 'japan'
      ? {
          title: '\u30ed\u30b0\u30a4\u30f3',
          caption:
            '\u30a2\u30ab\u30a6\u30f3\u30c8\u3092\u304a\u6301\u3061\u306e\u65b9\u306fID\u3068\u30d1\u30b9\u30ef\u30fc\u30c9\u3067\u30ed\u30b0\u30a4\u30f3',
          idLabel: 'ID / \u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9',
          idPlaceholder: 'ID \u307e\u305f\u306f \u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9',
          passwordLabel: '\u30d1\u30b9\u30ef\u30fc\u30c9',
          passwordPlaceholder: '\u30d1\u30b9\u30ef\u30fc\u30c9',
          loginAction: '\u30ed\u30b0\u30a4\u30f3',
          backSignup: '\u767b\u9332\u65b9\u6cd5\u9078\u629e\u306b\u623b\u308b',
          missingId: 'ID\u307e\u305f\u306f\u30e1\u30fc\u30eb\u30a2\u30c9\u30ec\u30b9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
          missingPassword: '\u30d1\u30b9\u30ef\u30fc\u30c9\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002',
        }
      : {
          title: 'Log In',
          caption: 'If you already have an account, sign in with your ID and password.',
          idLabel: 'ID / Email',
          idPlaceholder: 'ID or Email',
          passwordLabel: 'Password',
          passwordPlaceholder: 'Password',
          loginAction: 'Log In',
          backSignup: 'Back to sign up options',
          missingId: 'Please enter your ID or email.',
          missingPassword: 'Please enter your password.',
        };

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
      setMessage(error instanceof Error ? error.message : 'Login failed.');
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

          <View style={styles.header}>
            <Text style={styles.brand}>Mugimaru</Text>
            <Text style={styles.title}>{copy.title}</Text>
            <Text style={styles.caption}>{copy.caption}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>{copy.idLabel}</Text>
            <TextInput
              style={styles.input}
              value={credential}
              onChangeText={setCredential}
              placeholder={copy.idPlaceholder}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.label}>{copy.passwordLabel}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={copy.passwordPlaceholder}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              style={[styles.loginButton, isBusy ? styles.loginButtonDisabled : null]}
              onPress={() => void handleLogin()}
              disabled={isBusy}>
              <Text style={styles.loginButtonText}>{copy.loginAction}</Text>
            </Pressable>

            <Pressable onPress={() => router.replace('/signup')} disabled={isBusy}>
              <Text style={styles.backLink}>{copy.backSignup}</Text>
            </Pressable>

            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
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
  heroImage: {
    width: '100%',
    height: 220,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  brand: {
    color: '#5a3f27',
    fontFamily: Fonts.rounded,
    fontSize: 38,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 42,
  },
  title: {
    color: '#4b3a2a',
    fontSize: 28,
    fontFamily: Fonts.rounded,
    fontWeight: '700',
  },
  caption: {
    color: '#7f694f',
    fontSize: 13,
    textAlign: 'center',
  },
  formCard: {
    backgroundColor: '#fffaf2',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ddccb5',
    padding: 14,
    gap: 10,
  },
  label: {
    color: '#6a543c',
    fontSize: 13,
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
  loginButton: {
    marginTop: 6,
    borderRadius: 10,
    backgroundColor: '#b89062',
    alignItems: 'center',
    paddingVertical: 11,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  backLink: {
    marginTop: 2,
    color: '#8a7459',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  message: {
    color: '#6f583f',
    fontSize: 12,
  },
});

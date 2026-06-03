import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSupabaseEnv } from '@/lib/supabase';
import { loginWithEmailAndPassword } from '@/lib/password-auth';
import { getAppUserByExternalId, upsertAppUser } from '@/lib/user-data';

export type AuthProvider = 'line' | 'google' | 'apple' | 'x' | 'email' | 'guest';

export type SocialLoginProfile = {
  externalId: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
};

export type UserProfile = {
  externalId: string;
  name: string;
  email: string;
  avatarUrl: string;
  headerUrl: string;
  bio: string;
  dogName: string;
  dogBreed: string;
  prefecture: string;
  city: string;
  provider: AuthProvider;
};

type AuthContextValue = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  loginWithSocial: (
    provider: 'line' | 'google' | 'apple' | 'x',
    socialProfile: SocialLoginProfile
  ) => Promise<void>;
  loginWithEmail: (email: string, options?: { externalId?: string; name?: string }) => Promise<void>;
  loginWithPassword: (credential: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  updateProfile: (
    patch: Pick<UserProfile, 'name' | 'email' | 'avatarUrl' | 'headerUrl' | 'bio' | 'dogName' | 'dogBreed' | 'prefecture' | 'city'>
  ) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_STORAGE_KEY = 'mugimaru.auth.profile';

function createLocalExternalId(prefix: string) {
  return `${prefix}:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function AuthProviderRoot({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isHydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!active || !stored) return;
        const parsed = JSON.parse(stored) as UserProfile;
        if (parsed && typeof parsed.name === 'string' && typeof parsed.email === 'string') {
          setProfile({
            ...parsed,
            externalId:
              typeof parsed.externalId === 'string' && parsed.externalId
                ? parsed.externalId
                : createLocalExternalId(parsed.provider ?? 'email'),
            avatarUrl: typeof parsed.avatarUrl === 'string' ? parsed.avatarUrl : '',
            headerUrl: typeof parsed.headerUrl === 'string' ? parsed.headerUrl : '',
            bio: typeof parsed.bio === 'string' ? parsed.bio : '',
            dogName: typeof parsed.dogName === 'string' ? parsed.dogName : '',
            dogBreed: typeof parsed.dogBreed === 'string' ? parsed.dogBreed : '',
            prefecture: typeof parsed.prefecture === 'string' ? parsed.prefecture : '',
            city: typeof parsed.city === 'string' ? parsed.city : '',
          });
        }
      } catch {
        // no-op
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    };

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const persist = async () => {
      try {
        if (profile) {
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(profile));
        } else {
          await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        }
      } catch {
        // no-op
      }
    };

    persist();
  }, [profile, isHydrated]);

  const loginWithSocial = useCallback(
    async (provider: 'line' | 'google' | 'apple' | 'x', socialProfile: SocialLoginProfile) => {
      const defaultNameByProvider: Record<'line' | 'google' | 'apple' | 'x', string> = {
        line: 'LINEユーザー',
        google: 'Googleユーザー',
        apple: 'Appleユーザー',
        x: 'Xユーザー',
      };
      const nextProfile: UserProfile = {
        externalId: socialProfile.externalId || createLocalExternalId(provider),
        name: socialProfile.name || defaultNameByProvider[provider],
        email: socialProfile.email?.trim().toLowerCase() ?? '',
        avatarUrl: socialProfile.avatarUrl?.trim() ?? '',
        headerUrl: '',
        bio: '',
        dogName: '',
        dogBreed: '',
        prefecture: '',
        city: '',
        provider,
      };

      if (hasSupabaseEnv) {
        await upsertAppUser({
          externalId: nextProfile.externalId,
          name: nextProfile.name,
          email: nextProfile.email || null,
          avatarUrl: nextProfile.avatarUrl || null,
          bio: nextProfile.bio || null,
          dogName: nextProfile.dogName || null,
          dogBreed: nextProfile.dogBreed || null,
          provider,
        });
      }

      setProfile(nextProfile);
    },
    []
  );

  const loginWithEmailVerified = useCallback(
    async (email: string, options?: { externalId?: string; name?: string }) => {
      const normalizedEmail = email.trim().toLowerCase();
      const fallbackName = normalizedEmail.split('@')[0] || 'ユーザー';
      const nextProfile: UserProfile = {
        externalId: options?.externalId?.trim() || `email:${normalizedEmail}`,
        name: options?.name?.trim() || fallbackName,
        email: normalizedEmail,
        avatarUrl: '',
        headerUrl: '',
        bio: '',
        dogName: '',
        dogBreed: '',
        prefecture: '',
        city: '',
        provider: 'email',
      };

      if (hasSupabaseEnv) {
        await upsertAppUser({
          externalId: nextProfile.externalId,
          name: nextProfile.name,
          email: nextProfile.email,
          avatarUrl: null,
          bio: null,
          dogName: null,
          dogBreed: null,
          provider: 'email',
        });
      }

      setProfile(nextProfile);
    },
    []
  );

  const loginWithPasswordCredential = useCallback(async (credential: string, password: string) => {
    const normalizedCredential = credential.trim();
    const normalizedPassword = password.trim();

    if (!normalizedCredential) {
        throw new Error('ログインIDを入力してください。');
    }
    if (!normalizedPassword) {
        throw new Error('パスワードを入力してください。');
    }
    if (!hasSupabaseEnv) {
        throw new Error('認証設定が未設定です。');
    }

    let resolvedEmail = normalizedCredential.toLowerCase();
    if (!resolvedEmail.includes('@')) {
      const matchedUser = await getAppUserByExternalId(normalizedCredential);
      const matchedEmail = matchedUser?.email?.trim().toLowerCase();
      if (!matchedEmail) {
        throw new Error('ログインIDが見つかりません。メールアドレスでお試しください。');
      }
      resolvedEmail = matchedEmail;
    }

    const signedIn = await loginWithEmailAndPassword(resolvedEmail, normalizedPassword);
    const existingUser = await getAppUserByExternalId(signedIn.externalId);

    const nextProfile: UserProfile = {
      externalId: signedIn.externalId,
      name: existingUser?.name?.trim() || signedIn.name,
      email: signedIn.email,
      avatarUrl: existingUser?.avatar_url?.trim() || signedIn.avatarUrl || '',
      headerUrl: '',
      bio: existingUser?.bio?.trim() || '',
      dogName: existingUser?.dog_name?.trim() || '',
      dogBreed: existingUser?.dog_breed?.trim() || '',
      prefecture: '',
      city: '',
      provider: 'email',
    };

    await upsertAppUser({
      externalId: nextProfile.externalId,
      name: nextProfile.name,
      email: nextProfile.email || null,
      avatarUrl: nextProfile.avatarUrl || null,
      bio: nextProfile.bio || null,
      dogName: nextProfile.dogName || null,
      dogBreed: nextProfile.dogBreed || null,
      provider: 'email',
    });

    setProfile(nextProfile);
  }, []);

  const loginAsGuest = useCallback(async () => {
    const nextProfile: UserProfile = {
      externalId: createLocalExternalId('guest'),
      name: 'ゲスト',
      email: '',
      avatarUrl: '',
      headerUrl: '',
      bio: '',
      dogName: '',
      dogBreed: '',
      prefecture: '',
      city: '',
      provider: 'guest',
    };

    setProfile(nextProfile);
  }, []);

  const updateProfile = useCallback(
    async (
      patch: Pick<UserProfile, 'name' | 'email' | 'avatarUrl' | 'headerUrl' | 'bio' | 'dogName' | 'dogBreed' | 'prefecture' | 'city'>
    ) => {
      const current = profile;
      if (!current) return;

      const normalizedEmail = patch.email.trim().toLowerCase();
      const normalizedAvatarUrl = patch.avatarUrl.trim();
      const normalizedHeaderUrl = patch.headerUrl.trim();
      const normalizedBio = patch.bio.trim();
      const normalizedDogName = patch.dogName.trim();
      const normalizedDogBreed = patch.dogBreed.trim();
      const normalizedPrefecture = patch.prefecture.trim();
      const normalizedCity = patch.city.trim();
      const nextProfile: UserProfile = {
        ...current,
        name: patch.name,
        email: normalizedEmail,
        avatarUrl: normalizedAvatarUrl,
        headerUrl: normalizedHeaderUrl,
        bio: normalizedBio,
        dogName: normalizedDogName,
        dogBreed: normalizedDogBreed,
        prefecture: normalizedPrefecture,
        city: normalizedCity,
      };

      if (hasSupabaseEnv && current.provider !== 'guest') {
        await upsertAppUser({
          externalId: current.externalId,
          name: nextProfile.name,
          email: nextProfile.email || null,
          avatarUrl: nextProfile.avatarUrl || null,
          bio: nextProfile.bio || null,
          dogName: nextProfile.dogName || null,
          dogBreed: nextProfile.dogBreed || null,
          provider: current.provider,
        });
      }

      setProfile(nextProfile);
    },
    [profile]
  );

  const logout = useCallback(() => {
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isHydrated,
      isAuthenticated: Boolean(profile),
      profile,
      loginWithSocial,
      loginWithEmail: loginWithEmailVerified,
      loginWithPassword: loginWithPasswordCredential,
      loginAsGuest,
      updateProfile,
      logout,
    }),
    [
      isHydrated,
      profile,
      loginWithSocial,
      loginWithEmailVerified,
      loginWithPasswordCredential,
      loginAsGuest,
      updateProfile,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used within AuthProviderRoot');
  }
  return value;
}

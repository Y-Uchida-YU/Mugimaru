import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hasSupabaseEnv } from '@/lib/supabase';
import { loginWithEmailAndPassword } from '@/lib/password-auth';
import { getAppUserByExternalId, upsertAppUser } from '@/lib/user-data';

export type AuthProvider = 'line' | 'x' | 'email' | 'guest';

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
  bio: string;
  dogName: string;
  dogBreed: string;
  provider: AuthProvider;
};

type AuthContextValue = {
  isHydrated: boolean;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  loginWithSocial: (provider: 'line' | 'x', socialProfile: SocialLoginProfile) => Promise<void>;
  loginWithEmail: (email: string, options?: { externalId?: string; name?: string }) => Promise<void>;
  loginWithPassword: (credential: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
  updateProfile: (patch: Pick<UserProfile, 'name' | 'email' | 'avatarUrl' | 'bio' | 'dogName' | 'dogBreed'>) => Promise<void>;
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
            bio: typeof parsed.bio === 'string' ? parsed.bio : '',
            dogName: typeof parsed.dogName === 'string' ? parsed.dogName : '',
            dogBreed: typeof parsed.dogBreed === 'string' ? parsed.dogBreed : '',
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
    async (provider: 'line' | 'x', socialProfile: SocialLoginProfile) => {
      const nextProfile: UserProfile = {
        externalId: socialProfile.externalId || createLocalExternalId(provider),
        name: socialProfile.name || (provider === 'line' ? 'LINE User' : 'X User'),
        email: socialProfile.email?.trim().toLowerCase() ?? '',
        avatarUrl: socialProfile.avatarUrl?.trim() ?? '',
        bio: '',
        dogName: '',
        dogBreed: '',
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
      const fallbackName = normalizedEmail.split('@')[0] || 'User';
      const nextProfile: UserProfile = {
        externalId: options?.externalId?.trim() || `email:${normalizedEmail}`,
        name: options?.name?.trim() || fallbackName,
        email: normalizedEmail,
        avatarUrl: '',
        bio: '',
        dogName: '',
        dogBreed: '',
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
      throw new Error('Login ID is required.');
    }
    if (!normalizedPassword) {
      throw new Error('Password is required.');
    }
    if (!hasSupabaseEnv) {
      throw new Error('Supabase auth env is missing.');
    }

    let resolvedEmail = normalizedCredential.toLowerCase();
    if (!resolvedEmail.includes('@')) {
      const matchedUser = await getAppUserByExternalId(normalizedCredential);
      const matchedEmail = matchedUser?.email?.trim().toLowerCase();
      if (!matchedEmail) {
        throw new Error('Login ID was not found. Use your email address.');
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
      bio: existingUser?.bio?.trim() || '',
      dogName: existingUser?.dog_name?.trim() || '',
      dogBreed: existingUser?.dog_breed?.trim() || '',
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
      name: 'Guest',
      email: '',
      avatarUrl: '',
      bio: '',
      dogName: '',
      dogBreed: '',
      provider: 'guest',
    };

    setProfile(nextProfile);
  }, []);

  const updateProfile = useCallback(
    async (patch: Pick<UserProfile, 'name' | 'email' | 'avatarUrl' | 'bio' | 'dogName' | 'dogBreed'>) => {
      const current = profile;
      if (!current) return;

      const normalizedEmail = patch.email.trim().toLowerCase();
      const normalizedAvatarUrl = patch.avatarUrl.trim();
      const normalizedBio = patch.bio.trim();
      const normalizedDogName = patch.dogName.trim();
      const normalizedDogBreed = patch.dogBreed.trim();
      const nextProfile: UserProfile = {
        ...current,
        name: patch.name,
        email: normalizedEmail,
        avatarUrl: normalizedAvatarUrl,
        bio: normalizedBio,
        dogName: normalizedDogName,
        dogBreed: normalizedDogBreed,
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

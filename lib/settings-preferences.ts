import AsyncStorage from '@react-native-async-storage/async-storage';

export const PERSONAL_PREFS_KEY = 'mugimaru.settings.personal-preferences';

export type PersonalPreferences = {
  pushEnabled: boolean;
  weeklyDigestEnabled: boolean;
  mapHintEnabled: boolean;
  language: 'auto' | 'ja' | 'en';
};

export const DEFAULT_PERSONAL_PREFS: PersonalPreferences = {
  pushEnabled: true,
  weeklyDigestEnabled: false,
  mapHintEnabled: true,
  language: 'auto',
};

export async function loadPersonalPreferences() {
  try {
    const stored = await AsyncStorage.getItem(PERSONAL_PREFS_KEY);
    if (!stored) {
      return DEFAULT_PERSONAL_PREFS;
    }
    const parsed = JSON.parse(stored) as Partial<PersonalPreferences>;
    return {
      pushEnabled: parsed.pushEnabled ?? DEFAULT_PERSONAL_PREFS.pushEnabled,
      weeklyDigestEnabled: parsed.weeklyDigestEnabled ?? DEFAULT_PERSONAL_PREFS.weeklyDigestEnabled,
      mapHintEnabled: parsed.mapHintEnabled ?? DEFAULT_PERSONAL_PREFS.mapHintEnabled,
      language: parsed.language === 'ja' || parsed.language === 'en' ? parsed.language : 'auto',
    } satisfies PersonalPreferences;
  } catch {
    return DEFAULT_PERSONAL_PREFS;
  }
}

export async function savePersonalPreferences(value: PersonalPreferences) {
  await AsyncStorage.setItem(PERSONAL_PREFS_KEY, JSON.stringify(value));
}


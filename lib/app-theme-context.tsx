import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_STORAGE_KEY = 'mugimaru.app.theme.id';

export type AppTheme = {
  id: string;
  name: string;
  description: string;
  colors: {
    background: string;
    surface: string;
    elevated: string;
    border: string;
    text: string;
    mutedText: string;
    accent: string;
    accentContrast: string;
    chip: string;
    chipText: string;
  };
};

const APP_THEMES: AppTheme[] = [
  {
    id: 'lemon-zest',
    name: 'Lemon Zest',
    description: 'Bright citrus with calm neutrals.',
    colors: {
      background: '#fff8e7',
      surface: '#fffef8',
      elevated: '#ffe681',
      border: '#f0ddb0',
      text: '#2f2200',
      mutedText: '#7a5d11',
      accent: '#f2cb57',
      accentContrast: '#2d2205',
      chip: '#fff0b8',
      chipText: '#664f11',
    },
  },
  {
    id: 'sakura-bloom',
    name: 'Sakura Bloom',
    description: 'Soft pink petals and elegant contrast.',
    colors: {
      background: '#fff3f6',
      surface: '#fffdfd',
      elevated: '#ffd9e3',
      border: '#f3c9d8',
      text: '#4d2a36',
      mutedText: '#8e5d70',
      accent: '#e85f8f',
      accentContrast: '#fff8fb',
      chip: '#ffe7ef',
      chipText: '#7c3d58',
    },
  },
  {
    id: 'mint-breeze',
    name: 'Mint Breeze',
    description: 'Fresh mint and clean airy tones.',
    colors: {
      background: '#f1fff8',
      surface: '#fbfffd',
      elevated: '#c9f4dd',
      border: '#b7e9cf',
      text: '#184736',
      mutedText: '#4d7d6c',
      accent: '#21b47e',
      accentContrast: '#f5fffb',
      chip: '#def7eb',
      chipText: '#256e52',
    },
  },
  {
    id: 'ocean-tide',
    name: 'Ocean Tide',
    description: 'Aqua depth with clear readability.',
    colors: {
      background: '#eef9ff',
      surface: '#fbfeff',
      elevated: '#cdeeff',
      border: '#b6ddf3',
      text: '#13384f',
      mutedText: '#4f7891',
      accent: '#248bc9',
      accentContrast: '#f3faff',
      chip: '#def1ff',
      chipText: '#215f8a',
    },
  },
  {
    id: 'lavender-mist',
    name: 'Lavender Mist',
    description: 'Muted violet with a premium calm mood.',
    colors: {
      background: '#f6f3ff',
      surface: '#fdfdff',
      elevated: '#e3dbff',
      border: '#d4c8f5',
      text: '#35285f',
      mutedText: '#6d5b95',
      accent: '#7a5de3',
      accentContrast: '#f8f5ff',
      chip: '#ece6ff',
      chipText: '#5843a1',
    },
  },
  {
    id: 'sunset-coral',
    name: 'Sunset Coral',
    description: 'Warm coral with dusk-like softness.',
    colors: {
      background: '#fff4f0',
      surface: '#fffdfc',
      elevated: '#ffd6ca',
      border: '#f2c1b2',
      text: '#4f2a20',
      mutedText: '#8a5b50',
      accent: '#e76a4f',
      accentContrast: '#fff9f7',
      chip: '#ffe7e0',
      chipText: '#8c4333',
    },
  },
  {
    id: 'forest-moss',
    name: 'Forest Moss',
    description: 'Natural green inspired by woodland trails.',
    colors: {
      background: '#f3f8f1',
      surface: '#fdfefc',
      elevated: '#d7e5cf',
      border: '#c3d7b8',
      text: '#22351f',
      mutedText: '#5d7457',
      accent: '#4b8f3a',
      accentContrast: '#f8fff4',
      chip: '#e6f0e1',
      chipText: '#3f6f34',
    },
  },
  {
    id: 'midnight-ink',
    name: 'Midnight Ink',
    description: 'Dark navy with luminous highlights.',
    colors: {
      background: '#101624',
      surface: '#1b2335',
      elevated: '#27324b',
      border: '#30415f',
      text: '#eef3ff',
      mutedText: '#9fb0cd',
      accent: '#66a3ff',
      accentContrast: '#081326',
      chip: '#25324d',
      chipText: '#cfe0ff',
    },
  },
  {
    id: 'peach-cream',
    name: 'Peach Cream',
    description: 'Sweet pastel peach with warm contrast.',
    colors: {
      background: '#fff8f2',
      surface: '#fffefc',
      elevated: '#ffe2cc',
      border: '#f1cdb1',
      text: '#4d311f',
      mutedText: '#8f6a52',
      accent: '#ee8f48',
      accentContrast: '#fff9f4',
      chip: '#ffeeda',
      chipText: '#985628',
    },
  },
  {
    id: 'arctic-sky',
    name: 'Arctic Sky',
    description: 'Cold crystal tones and focused accents.',
    colors: {
      background: '#f4fbff',
      surface: '#fcfeff',
      elevated: '#d9efff',
      border: '#c2ddf2',
      text: '#1d3f59',
      mutedText: '#5b7d93',
      accent: '#2b9de3',
      accentContrast: '#f7fcff',
      chip: '#e8f4ff',
      chipText: '#2a688f',
    },
  },
  {
    id: 'ruby-noir',
    name: 'Ruby Noir',
    description: 'Elegant red accents on deep neutrals.',
    colors: {
      background: '#1c1519',
      surface: '#2a1f24',
      elevated: '#3b2a31',
      border: '#4b343e',
      text: '#ffeef3',
      mutedText: '#c4a3b0',
      accent: '#f05b7a',
      accentContrast: '#2a0f1a',
      chip: '#442b35',
      chipText: '#ffd8e4',
    },
  },
  {
    id: 'cobalt-pop',
    name: 'Cobalt Pop',
    description: 'Vivid blue with energetic highlights.',
    colors: {
      background: '#eef2ff',
      surface: '#fbfcff',
      elevated: '#d7e0ff',
      border: '#becdf2',
      text: '#1f2f5a',
      mutedText: '#5d6f9d',
      accent: '#3f6fff',
      accentContrast: '#f5f8ff',
      chip: '#e5ebff',
      chipText: '#3453bf',
    },
  },
  {
    id: 'matcha-latte',
    name: 'Matcha Latte',
    description: 'Japanese cafe vibe with creamy greens.',
    colors: {
      background: '#f7f8f0',
      surface: '#fefefb',
      elevated: '#e1e8c8',
      border: '#d0d9b0',
      text: '#344125',
      mutedText: '#677555',
      accent: '#7ea348',
      accentContrast: '#fafff2',
      chip: '#ecf1db',
      chipText: '#5b7f2f',
    },
  },
  {
    id: 'rosewood',
    name: 'Rosewood',
    description: 'Rich wood tones with blush accents.',
    colors: {
      background: '#f7f2f1',
      surface: '#fefdfd',
      elevated: '#ead8d5',
      border: '#d9c3bf',
      text: '#4a2f2a',
      mutedText: '#7e605a',
      accent: '#c46660',
      accentContrast: '#fff8f7',
      chip: '#f0e1de',
      chipText: '#8d4a45',
    },
  },
  {
    id: 'amber-night',
    name: 'Amber Night',
    description: 'Golden amber lights on dark graphite.',
    colors: {
      background: '#181513',
      surface: '#25211d',
      elevated: '#332c25',
      border: '#44382c',
      text: '#fff3df',
      mutedText: '#c7ae8c',
      accent: '#f4b24d',
      accentContrast: '#2d1f0a',
      chip: '#3a2f22',
      chipText: '#ffdca8',
    },
  },
  {
    id: 'glacier-violet',
    name: 'Glacier Violet',
    description: 'Icy violet with modern clarity.',
    colors: {
      background: '#f4f6ff',
      surface: '#fdfdff',
      elevated: '#dde3ff',
      border: '#c7d1f0',
      text: '#2e3562',
      mutedText: '#666f98',
      accent: '#6f7de9',
      accentContrast: '#f6f8ff',
      chip: '#e7ebff',
      chipText: '#4f5fb8',
    },
  },
  {
    id: 'turquoise-lagoon',
    name: 'Turquoise Lagoon',
    description: 'Tropical turquoise with white space.',
    colors: {
      background: '#effffd',
      surface: '#fcfffe',
      elevated: '#cbf7f1',
      border: '#b2e8df',
      text: '#174941',
      mutedText: '#4f7e77',
      accent: '#15bca8',
      accentContrast: '#f2fffd',
      chip: '#ddf8f4',
      chipText: '#1d7f72',
    },
  },
  {
    id: 'sand-dune',
    name: 'Sand Dune',
    description: 'Desert beige with premium warmth.',
    colors: {
      background: '#faf5ee',
      surface: '#fffefb',
      elevated: '#ebdcc7',
      border: '#dcc8ab',
      text: '#4a3927',
      mutedText: '#7f684f',
      accent: '#b8874a',
      accentContrast: '#fff9f2',
      chip: '#f2e7d7',
      chipText: '#80592e',
    },
  },
  {
    id: 'berry-spark',
    name: 'Berry Spark',
    description: 'Playful berry tones with bright highlights.',
    colors: {
      background: '#fff1f8',
      surface: '#fffdff',
      elevated: '#ffd7ec',
      border: '#f3bfdc',
      text: '#522642',
      mutedText: '#8f5d79',
      accent: '#db4d9a',
      accentContrast: '#fff7fc',
      chip: '#ffe6f4',
      chipText: '#8b2f62',
    },
  },
  {
    id: 'aurora-green',
    name: 'Aurora Green',
    description: 'Fresh neon-inspired modern green.',
    colors: {
      background: '#f1fff5',
      surface: '#fbfffd',
      elevated: '#d3f7df',
      border: '#b9e9c8',
      text: '#1b412b',
      mutedText: '#4d7a5e',
      accent: '#26c26b',
      accentContrast: '#f3fff8',
      chip: '#e1f8ea',
      chipText: '#2a7d4e',
    },
  },
];

type AppThemeContextValue = {
  themes: readonly AppTheme[];
  activeTheme: AppTheme;
  setActiveThemeById: (themeId: string) => void;
  isHydrated: boolean;
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function AppThemeProvider({ children }: PropsWithChildren) {
  const [themeId, setThemeId] = useState(APP_THEMES[0].id);
  const [isHydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!active || !stored) return;
        if (APP_THEMES.some((theme) => theme.id === stored)) {
          setThemeId(stored);
        }
      } catch {
        // no-op
      } finally {
        if (active) setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const persist = async () => {
      try {
        await AsyncStorage.setItem(THEME_STORAGE_KEY, themeId);
      } catch {
        // no-op
      }
    };
    void persist();
  }, [isHydrated, themeId]);

  const setActiveThemeById = useCallback((nextThemeId: string) => {
    if (!APP_THEMES.some((theme) => theme.id === nextThemeId)) {
      return;
    }
    setThemeId(nextThemeId);
  }, []);

  const activeTheme = useMemo(
    () => APP_THEMES.find((theme) => theme.id === themeId) ?? APP_THEMES[0],
    [themeId]
  );

  const value = useMemo(
    () => ({
      themes: APP_THEMES,
      activeTheme,
      setActiveThemeById,
      isHydrated,
    }),
    [activeTheme, isHydrated, setActiveThemeById]
  );

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(AppThemeContext);
  if (!value) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return value;
}

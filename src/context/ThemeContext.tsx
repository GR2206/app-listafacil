import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useCartStore } from '@/store/cartStore';
import { getThemeById, DEFAULT_THEME_ID } from '@/theme/themes';

export type SupermarketTheme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  border: string;
  danger: string;
  cardColor: string;
  gridBackground: string;
  gridBorder: string;
  bannerBorder: string;
};

interface ThemeContextValue {
  theme: SupermarketTheme;
  themeId: string;
  isDarkBackground: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const supermarketId = useCartStore((s) => s.supermarketId);

  const value = useMemo<ThemeContextValue>(() => {
    const themeId = supermarketId ?? DEFAULT_THEME_ID;
    const theme = getThemeById(themeId) as SupermarketTheme;
    const isDarkBackground = theme.background === '#121214';
    return { theme, themeId, isDarkBackground };
  }, [supermarketId]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useSupermarketTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    const theme = getThemeById(DEFAULT_THEME_ID) as SupermarketTheme;
    return { theme, themeId: DEFAULT_THEME_ID, isDarkBackground: true };
  }
  return ctx;
}

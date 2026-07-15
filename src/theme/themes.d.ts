import type { SupermarketTheme } from '@/context/ThemeContext';

export const DEFAULT_THEME_ID: string;

export const SUPERMARKET_THEMES: Record<string, SupermarketTheme>;

export function getThemeById(themeId: string): SupermarketTheme;

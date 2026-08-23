import { getStoreUpdateUrl } from '@/config/appLinks';

/** JSON remoto con versionCode mínimo/recomendado y mensaje para testers. */
export const APP_UPDATE_GIST_URL =
  process.env.EXPO_PUBLIC_APP_UPDATE_GIST_URL ??
  'https://gist.githubusercontent.com/GR2206/385d2f581dfeea93ee3c35ddcd1314ed/raw/app-update.json';

export const APP_UPDATE_FETCH_TIMEOUT_MS = 10_000;

/** Fallback local: siempre la tienda de la plataforma (nunca Expo artifacts). */
export const DEFAULT_APP_UPDATE_URL = getStoreUpdateUrl();

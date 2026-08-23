import { Platform } from 'react-native';

/** Marca y enlaces públicos de la app (compartir, banners, etc.) */
export const APP_BRAND_NAME = 'ListaFacil';

export const ANDROID_PACKAGE_ID = 'com.listafacil.app';

/** Google Play Store — enlace HTTPS público. */
export const PLAY_STORE_URL =
  process.env.EXPO_PUBLIC_PLAY_STORE_URL?.trim() ||
  `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

/** Abre la app de Play Store en el dispositivo (Android). */
export const PLAY_STORE_MARKET_URL = `market://details?id=${ANDROID_PACKAGE_ID}`;

/**
 * App Store (iOS). Preferí EXPO_PUBLIC_APP_STORE_URL con el id numérico
 * (https://apps.apple.com/app/idXXXXXXXX).
 */
export const APP_STORE_URL =
  process.env.EXPO_PUBLIC_APP_STORE_URL?.trim() ||
  'https://apps.apple.com/search?term=Lista%20Facil';

/** Enlace genérico para compartir / QR (Play Store por defecto). */
export const APP_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL?.trim() || PLAY_STORE_URL;

/**
 * URL de “Actualizar” según plataforma.
 * Nunca usa artefactos de Expo: siempre la tienda correspondiente.
 */
export function getStoreUpdateUrl(): string {
  if (Platform.OS === 'ios') return APP_STORE_URL;
  return PLAY_STORE_URL;
}

/** Preferido en Android: market:// con fallback HTTPS. */
export function getAndroidStoreUpdateUrls(): { primary: string; fallback: string } {
  return {
    primary: PLAY_STORE_MARKET_URL,
    fallback: PLAY_STORE_URL,
  };
}

export const SHARE_INVITATION_TITLE = `Vení a ahorrar con ${APP_BRAND_NAME}`;

export function buildShareInvitationBlock(): string {
  return `${SHARE_INVITATION_TITLE}\nDescargá la app: ${APP_DOWNLOAD_URL}`;
}

/** Deep link para abrir una lista compartida dentro de Lista Fácil. */
export function buildSharedShoppingListDeepLink(listId: string): string {
  return `listafacil://crear-lista?id=${encodeURIComponent(listId.trim())}`;
}

export function buildSharedShoppingListShareMessage(listId: string, title?: string): string {
  const deepLink = buildSharedShoppingListDeepLink(listId);
  const label = title?.trim() || 'Lista de compras';
  return `${label} en ${APP_BRAND_NAME}\n\nAbrí en la app:\n${deepLink}\n\nSi no tenés la app: ${APP_DOWNLOAD_URL}`;
}

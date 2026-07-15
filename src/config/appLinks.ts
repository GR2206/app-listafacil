/** Marca y enlaces públicos de la app (compartir, banners, etc.) */
export const APP_BRAND_NAME = 'ListaFacil';

/** Google Play Store — enlace público para compartir y QR del menú. */
export const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.listafacil.app';

export const APP_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL?.trim() || PLAY_STORE_URL;

export const SHARE_INVITATION_TITLE = `Vení a ahorrar con ${APP_BRAND_NAME}`;

export function buildShareInvitationBlock(): string {
  return `${SHARE_INVITATION_TITLE}\nDescargá la app: ${APP_DOWNLOAD_URL}`;
}

/** Deep link para abrir una lista compartida dentro de Lista Fácil. */
export function buildSharedShoppingListDeepLink(listId: string): string {
  return `listafacil://crear-lista?id=${encodeURIComponent(listId.trim())}`;
}

export function buildSharedShoppingListShareMessage(listId: string): string {
  const deepLink = buildSharedShoppingListDeepLink(listId);
  return `Lista de compras en ${APP_BRAND_NAME}\n\nAbrí en la app:\n${deepLink}\n\nSi no tenés la app: ${APP_DOWNLOAD_URL}`;
}

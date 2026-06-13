/** Marca y enlaces públicos de la app (compartir, banners, etc.) */
export const APP_BRAND_NAME = 'ListaFacil';

/** Landing con enlaces a Play Store / App Store cuando estén publicados */
export const APP_DOWNLOAD_URL =
  process.env.EXPO_PUBLIC_APP_DOWNLOAD_URL?.trim() || 'https://listafacil.app';

export const SHARE_INVITATION_TITLE = `Vení a ahorrar con ${APP_BRAND_NAME}`;

export function buildShareInvitationBlock(): string {
  return `${SHARE_INVITATION_TITLE}\nDescargá la app: ${APP_DOWNLOAD_URL}`;
}

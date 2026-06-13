/** Modo comerciante forzado (desarrollo / builds internas) */
export const IS_MERCHANT_MODE = process.env.EXPO_PUBLIC_IS_MERCHANT === 'true';

export const MERCHANT_ADMIN_USER =
  process.env.EXPO_PUBLIC_MERCHANT_ADMIN_USER ?? 'admin@listafacil.app';

export const MERCHANT_ADMIN_PASSWORD =
  process.env.EXPO_PUBLIC_MERCHANT_ADMIN_PASSWORD ?? 'ListaFacil2026!';

export const MERCHANT_SESSION_KEY = 'merchant_admin_session';

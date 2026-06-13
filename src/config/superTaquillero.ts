/** JSON público opcional con ranking semanal por zona (fallback o CDN). */
export const TAQUILLERO_JSON_URL =
  process.env.EXPO_PUBLIC_TAQUILLERO_JSON_URL?.trim() ?? '';

export const TAQUILLERO_FETCH_TIMEOUT_MS = 8_000;

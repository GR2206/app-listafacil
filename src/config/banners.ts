/**
 * URL raw del JSON centralizado (GitHub Gist u otro CDN).
 * Ejemplo: https://gist.githubusercontent.com/USER/ID/raw/banners.json
 */
export const BANNERS_GIST_URL =
  process.env.EXPO_PUBLIC_BANNERS_GIST_URL ??
  'https://gist.githubusercontent.com/GR2206/385d2f581dfeea93ee3c35ddcd1314ed/raw/banners-app.json';

export const BANNER_FETCH_TIMEOUT_MS = 12_000;

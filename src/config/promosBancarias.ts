/**
 * URL raw del JSON de promociones bancarias del día (GitHub Gist).
 * El bot BOTSCANNER escribe: { header, fecha, promos_bancarias: [...] }
 */
export const PROMOS_BANCARIAS_GIST_URL =
  process.env.EXPO_PUBLIC_PROMOS_BANCARIAS_GIST_URL ??
  'https://gist.githubusercontent.com/GR2206/385d2f581dfeea93ee3c35ddcd1314ed/raw/promos-bancarias.json';

export const PROMOS_BANCARIAS_FETCH_TIMEOUT_MS = 12_000;

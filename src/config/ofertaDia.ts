/**
 * URL raw del JSON de ofertas del día (GitHub Gist).
 * El bot BOTSCANNER escribe: { "oferta_dia": [{ id, titulo, precio, imagen, cta }] }
 */
export const OFERTA_DIA_GIST_URL =
  process.env.EXPO_PUBLIC_OFERTA_DIA_GIST_URL ??
  'https://gist.githubusercontent.com/GR2206/385d2f581dfeea93ee3c35ddcd1314ed/raw/oferta-dia.json';

export const OFERTA_DIA_FETCH_TIMEOUT_MS = 12_000;

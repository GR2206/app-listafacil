/**
 * URL raw del JSON de ofertas del día (GitHub Gist).
 * El bot BOTSCANNER escribe: { "oferta_dia": [{ id, titulo, precio, imagen, cta, ... }] }
 */
export const OFERTA_DIA_GIST_URL =
  process.env.EXPO_PUBLIC_OFERTA_DIA_GIST_URL ??
  'https://gist.githubusercontent.com/GR2206/385d2f581dfeea93ee3c35ddcd1314ed/raw/oferta-dia.json';

export const OFERTA_DIA_FETCH_TIMEOUT_MS = 12_000;

/** Slides visibles en el carrusel del home. */
export const OFERTA_DIA_CAROUSEL_LIMIT = 10;

/**
 * Pool de ofertas “taquilleras” (mayor % ahorro) desde el que se rota el carrusel.
 * Con ~3500 diarias, tomamos las mejores para variar sin bajar la calidad.
 */
export const OFERTA_DIA_HOT_POOL_SIZE = 80;

/** Cada cuánto cambia el set de slides del carrusel (15 min). */
export const OFERTA_DIA_ROTATE_MS = 15 * 60 * 1000;

/**
 * Re-fetch del Gist si el cache en memoria es más viejo que esto.
 * Además se invalida al cambiar el día calendario.
 */
export const OFERTA_DIA_CACHE_TTL_MS = 30 * 60 * 1000;

/** Máx. ofertas del mismo súper en un mismo carrusel (diversidad). */
export const OFERTA_DIA_MAX_PER_SUPER = 2;

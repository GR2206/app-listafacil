import { Image } from 'expo-image';

import defaultManifest from '@/data/oferta-dia.default.json';
import {
  OFERTA_DIA_CACHE_TTL_MS,
  OFERTA_DIA_CAROUSEL_LIMIT,
  OFERTA_DIA_FETCH_TIMEOUT_MS,
  OFERTA_DIA_GIST_URL,
  OFERTA_DIA_HOT_POOL_SIZE,
  OFERTA_DIA_MAX_PER_SUPER,
  OFERTA_DIA_ROTATE_MS,
} from '@/config/ofertaDia';
import type { OfertaDiaItem, OfertaDiaManifest } from '@/types/ofertaDia';
import { fetchRemoteJson } from '@/utils/fetchRemoteJson';
import { isSupermarketAvailableInZone } from '@/utils/supermarketCoverage';
import { isValidHttpUrl } from '@/utils/validateBannerUrl';

let cachedManifest: OfertaDiaManifest | null = null;
let usedRemoteManifest = false;
let cachedAtMs = 0;
const prefetchedUrls = new Set<string>();

const DEFAULT_CTA = 'Sumar a mi lista';
const GANCHOS = [
  'Oportunidad Irrepetible',
  'Precio imperdible',
  'Lo mejor del día',
  'Oferta flash',
];
const URGENCIAS = [
  'Solo hoy',
  'Hasta agotar stock',
  'Quedan pocas unidades',
  'Hoy o nunca',
];

function normalizeItem(raw: unknown, index: number): OfertaDiaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<OfertaDiaItem> & Record<string, unknown>;

  const titulo = typeof source.titulo === 'string' ? source.titulo.trim() : '';
  if (!titulo) return null;

  const precioRaw = source.precio;
  const precio =
    typeof precioRaw === 'number' && Number.isFinite(precioRaw)
      ? String(Math.round(precioRaw))
      : typeof precioRaw === 'string'
        ? precioRaw.trim()
        : '';

  const imagen =
    typeof source.imagen === 'string' && isValidHttpUrl(source.imagen)
      ? source.imagen.trim()
      : '';

  const cta =
    typeof source.cta === 'string' && source.cta.trim()
      ? source.cta.trim()
      : DEFAULT_CTA;

  const gancho =
    typeof source.gancho === 'string' && source.gancho.trim()
      ? source.gancho.trim()
      : GANCHOS[index % GANCHOS.length];

  const urgencia =
    typeof source.urgencia === 'string' && source.urgencia.trim()
      ? source.urgencia.trim()
      : URGENCIAS[index % URGENCIAS.length];

  const barcode =
    typeof source.barcode === 'string'
      ? source.barcode.trim()
      : typeof source.barcode === 'number'
        ? String(source.barcode)
        : '';

  const supermarketId =
    typeof source.supermarketId === 'string' ? source.supermarketId.trim() : '';
  const supermarketName =
    typeof source.supermarketName === 'string' ? source.supermarketName.trim() : '';

  const ahorroPctRaw = source.ahorroPct;
  const ahorroPct =
    typeof ahorroPctRaw === 'number' && Number.isFinite(ahorroPctRaw)
      ? Math.round(ahorroPctRaw)
      : null;

  const id =
    typeof source.id === 'number' && Number.isFinite(source.id)
      ? source.id
      : index + 1;

  return {
    id,
    titulo,
    precio,
    imagen,
    cta,
    gancho,
    urgencia,
    barcode,
    supermarketId,
    supermarketName,
    ahorroPct,
  };
}

function normalizeManifest(raw: unknown): OfertaDiaManifest {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<OfertaDiaManifest>;
  const list = Array.isArray(source.oferta_dia) ? source.oferta_dia : [];
  const oferta_dia = list
    .map((item, index) => normalizeItem(item, index))
    .filter((item): item is OfertaDiaItem => item !== null);

  return { oferta_dia };
}

/** Conserva ofertas de supers disponibles en la zona (o sin supermarketId). */
export function filterOfertaDiaForZone(
  manifest: OfertaDiaManifest,
  zoneSetting: string | null
): OfertaDiaManifest {
  const oferta_dia = manifest.oferta_dia.filter((item) => {
    const id = item.supermarketId?.trim();
    if (!id) return true;
    return isSupermarketAvailableInZone(id, zoneSetting);
  });
  return { oferta_dia };
}

export { OFERTA_DIA_CAROUSEL_LIMIT };

function compareOfertasHot(a: OfertaDiaItem, b: OfertaDiaItem): number {
  const ahorroA = a.ahorroPct ?? -1;
  const ahorroB = b.ahorroPct ?? -1;
  if (ahorroB !== ahorroA) return ahorroB - ahorroA;

  const imgA = a.imagen?.trim() ? 1 : 0;
  const imgB = b.imagen?.trim() ? 1 : 0;
  if (imgB !== imgA) return imgB - imgA;

  const priceA = Number(String(a.precio).replace(/[^\d.]/g, '')) || Number.POSITIVE_INFINITY;
  const priceB = Number(String(b.precio).replace(/[^\d.]/g, '')) || Number.POSITIVE_INFINITY;
  return priceA - priceB;
}

/** Ranking fijo: mayor % ahorro (taquilleras), con imagen, precio más bajo. */
export function rankOfertasByHotness(items: OfertaDiaItem[]): OfertaDiaItem[] {
  return [...items].sort(compareOfertasHot);
}

/** Top fijo (sin rotación) — útil para prefetch de arranque. */
export function pickTopOfertasForCarousel(
  items: OfertaDiaItem[],
  limit = OFERTA_DIA_CAROUSEL_LIMIT
): OfertaDiaItem[] {
  return rankOfertasByHotness(items).slice(0, limit);
}

export function getOfertaRotationBucket(nowMs = Date.now()): number {
  return Math.floor(nowMs / OFERTA_DIA_ROTATE_MS);
}

function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Shuffle determinista por semilla (mismo set para todos en la misma ventana). */
function seededShuffle<T>(list: T[], seed: number): T[] {
  const out = [...list];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/**
 * Diversifica por súper: no más de N del mismo en el carrusel.
 * Si no alcanza el límite, completa con el resto.
 */
function diversifyBySupermarket(
  items: OfertaDiaItem[],
  limit: number,
  maxPerSuper: number
): OfertaDiaItem[] {
  const picked: OfertaDiaItem[] = [];
  const counts = new Map<string, number>();
  const leftover: OfertaDiaItem[] = [];

  for (const item of items) {
    if (picked.length >= limit) break;
    const key = item.supermarketId?.trim() || `_anon_${item.id}`;
    const n = counts.get(key) ?? 0;
    if (n >= maxPerSuper) {
      leftover.push(item);
      continue;
    }
    counts.set(key, n + 1);
    picked.push(item);
  }

  for (const item of leftover) {
    if (picked.length >= limit) break;
    picked.push(item);
  }

  return picked;
}

/**
 * Carrusel rotativo: pool de las más taquilleras + ventana cada 15 min.
 * Cambia el set a lo largo del día sin perder las mejores ofertas.
 */
export function pickRotatingOfertasForCarousel(
  items: OfertaDiaItem[],
  options?: {
    limit?: number;
    poolSize?: number;
    nowMs?: number;
    maxPerSuper?: number;
  }
): OfertaDiaItem[] {
  const limit = options?.limit ?? OFERTA_DIA_CAROUSEL_LIMIT;
  const poolSize = options?.poolSize ?? OFERTA_DIA_HOT_POOL_SIZE;
  const nowMs = options?.nowMs ?? Date.now();
  const maxPerSuper = options?.maxPerSuper ?? OFERTA_DIA_MAX_PER_SUPER;

  if (items.length === 0) return [];

  const ranked = rankOfertasByHotness(items);
  const pool = ranked.slice(0, Math.max(limit, Math.min(poolSize, ranked.length)));
  const bucket = getOfertaRotationBucket(nowMs);
  const dayKey = new Date(nowMs).toISOString().slice(0, 10);
  const seed = hashSeed(`${dayKey}:${bucket}:${pool.length}`);
  const shuffled = seededShuffle(pool, seed);
  return diversifyBySupermarket(shuffled, limit, maxPerSuper);
}

function calendarDayKey(ms: number): string {
  return new Date(ms).toDateString();
}

export function isOfertaDiaCacheStale(nowMs = Date.now()): boolean {
  if (!cachedManifest || !usedRemoteManifest || cachedAtMs <= 0) return true;
  if (nowMs - cachedAtMs >= OFERTA_DIA_CACHE_TTL_MS) return true;
  if (calendarDayKey(cachedAtMs) !== calendarDayKey(nowMs)) return true;
  return false;
}

export async function fetchOfertaDiaManifest(options?: {
  forceRefresh?: boolean;
}): Promise<{ manifest: OfertaDiaManifest; fromRemote: boolean }> {
  const force = options?.forceRefresh === true;
  if (!force && cachedManifest && usedRemoteManifest && !isOfertaDiaCacheStale()) {
    return { manifest: cachedManifest, fromRemote: true };
  }

  try {
    const json = await fetchRemoteJson(
      OFERTA_DIA_GIST_URL,
      OFERTA_DIA_FETCH_TIMEOUT_MS,
      'Oferta día'
    );
    const manifest = normalizeManifest(json);
    cachedManifest = manifest;
    usedRemoteManifest = true;
    cachedAtMs = Date.now();
    return { manifest, fromRemote: true };
  } catch {
    if (cachedManifest && usedRemoteManifest && !force) {
      return { manifest: cachedManifest, fromRemote: true };
    }
    return {
      manifest: normalizeManifest(defaultManifest),
      fromRemote: false,
    };
  }
}

export function getStartupOfertaDiaManifest(): OfertaDiaManifest | null {
  return cachedManifest;
}

export async function prefetchOfertaDiaImages(manifest: OfertaDiaManifest): Promise<void> {
  const tasks: Promise<boolean>[] = [];
  for (const item of manifest.oferta_dia) {
    if (!item.imagen || prefetchedUrls.has(item.imagen)) continue;
    tasks.push(
      Image.prefetch(item.imagen, { cachePolicy: 'memory-disk' })
        .then((ok) => {
          if (ok) prefetchedUrls.add(item.imagen);
          return ok;
        })
        .catch(() => false)
    );
  }
  await Promise.all(tasks);
}

export function clearOfertaDiaCacheForTests(): void {
  cachedManifest = null;
  usedRemoteManifest = false;
  cachedAtMs = 0;
  prefetchedUrls.clear();
}

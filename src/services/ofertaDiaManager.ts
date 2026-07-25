import { Image } from 'expo-image';

import defaultManifest from '@/data/oferta-dia.default.json';
import { OFERTA_DIA_FETCH_TIMEOUT_MS, OFERTA_DIA_GIST_URL } from '@/config/ofertaDia';
import type { OfertaDiaItem, OfertaDiaManifest } from '@/types/ofertaDia';
import { fetchRemoteJson } from '@/utils/fetchRemoteJson';
import { isSupermarketAvailableInZone } from '@/utils/supermarketCoverage';
import { isValidHttpUrl } from '@/utils/validateBannerUrl';

let cachedManifest: OfertaDiaManifest | null = null;
let usedRemoteManifest = false;
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

/** Slides del carrusel home: pocas, las de mayor % de ahorro. */
export const OFERTA_DIA_CAROUSEL_LIMIT = 10;

export function pickTopOfertasForCarousel(
  items: OfertaDiaItem[],
  limit = OFERTA_DIA_CAROUSEL_LIMIT
): OfertaDiaItem[] {
  return [...items]
    .sort((a, b) => {
      const ahorroA = a.ahorroPct ?? -1;
      const ahorroB = b.ahorroPct ?? -1;
      if (ahorroB !== ahorroA) return ahorroB - ahorroA;

      const imgA = a.imagen?.trim() ? 1 : 0;
      const imgB = b.imagen?.trim() ? 1 : 0;
      if (imgB !== imgA) return imgB - imgA;

      const priceA = Number(String(a.precio).replace(/[^\d.]/g, '')) || Number.POSITIVE_INFINITY;
      const priceB = Number(String(b.precio).replace(/[^\d.]/g, '')) || Number.POSITIVE_INFINITY;
      return priceA - priceB;
    })
    .slice(0, limit);
}

export async function fetchOfertaDiaManifest(options?: {
  forceRefresh?: boolean;
}): Promise<{ manifest: OfertaDiaManifest; fromRemote: boolean }> {
  if (!options?.forceRefresh && cachedManifest && usedRemoteManifest) {
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
    return { manifest, fromRemote: true };
  } catch {
    if (cachedManifest && usedRemoteManifest && !options?.forceRefresh) {
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
  prefetchedUrls.clear();
}

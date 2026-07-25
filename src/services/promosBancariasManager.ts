import defaultManifest from '@/data/promos-bancarias.default.json';
import {
  PROMOS_BANCARIAS_FETCH_TIMEOUT_MS,
  PROMOS_BANCARIAS_GIST_URL,
} from '@/config/promosBancarias';
import type { PromoBancariaItem, PromosBancariasManifest } from '@/types/promosBancarias';
import { fetchRemoteJson } from '@/utils/fetchRemoteJson';
import { resolveProvince } from '@/utils/zoneRegion';
import { isSupermarketAvailableInZone } from '@/utils/supermarketCoverage';
import { isValidHttpUrl } from '@/utils/validateBannerUrl';
import { resolveAhorroPesos } from '@/utils/promoAhorroPesos';

let cachedManifest: PromosBancariasManifest | null = null;
let usedRemoteManifest = false;

function normalizeItem(raw: unknown): PromoBancariaItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<PromoBancariaItem> & Record<string, unknown>;

  const id = typeof source.id === 'string' ? source.id.trim() : '';
  const titulo = typeof source.titulo === 'string' ? source.titulo.trim() : '';
  const banco = typeof source.banco === 'string' ? source.banco.trim() : '';
  if (!id || !titulo) return null;

  const descuentoPct =
    typeof source.descuentoPct === 'number' && Number.isFinite(source.descuentoPct)
      ? Math.round(source.descuentoPct)
      : null;

  const dias = Array.isArray(source.dias)
    ? source.dias.map(Number).filter((n) => Number.isFinite(n) && n >= 0 && n <= 6)
    : [];
  const medios = Array.isArray(source.medios)
    ? source.medios.filter((m): m is string => typeof m === 'string')
    : [];
  const supers = Array.isArray(source.supers)
    ? source.supers.filter((m): m is string => typeof m === 'string')
    : [];
  const provincias = Array.isArray(source.provincias)
    ? source.provincias.filter((m): m is string => typeof m === 'string')
    : [];

  const venceEnHoras =
    typeof source.venceEnHoras === 'number' && Number.isFinite(source.venceEnHoras)
      ? source.venceEnHoras
      : 24;

  const tope = typeof source.tope === 'string' ? source.tope : '';
  const ahorroExplicit =
    typeof (source as { ahorroPesos?: unknown }).ahorroPesos === 'number' &&
    Number.isFinite((source as { ahorroPesos: number }).ahorroPesos)
      ? Math.round((source as { ahorroPesos: number }).ahorroPesos)
      : null;
  const ahorroPesos = resolveAhorroPesos({
    ahorroPesos: ahorroExplicit,
    tope,
  });

  const url =
    typeof source.url === 'string' && isValidHttpUrl(source.url) ? source.url.trim() : '';

  return {
    id,
    banco,
    titulo,
    descuentoPct,
    ahorroPesos,
    dias,
    vigenciaDesde: typeof source.vigenciaDesde === 'string' ? source.vigenciaDesde : '',
    vigenciaHasta: typeof source.vigenciaHasta === 'string' ? source.vigenciaHasta : '',
    tope,
    medios,
    supers,
    ambito: source.ambito === 'provinces' ? 'provinces' : 'national',
    provincias,
    url,
    prioridad: typeof source.prioridad === 'number' ? source.prioridad : 0,
    venceEnHoras,
    enProximas24h: Boolean(source.enProximas24h),
    aplicaHoy:
      typeof (source as { aplicaHoy?: unknown }).aplicaHoy === 'boolean'
        ? (source as { aplicaHoy: boolean }).aplicaHoy
        : undefined,
  };
}

function normalizeManifest(raw: unknown): PromosBancariasManifest {
  const source = (raw && typeof raw === 'object' ? raw : {}) as Partial<PromosBancariasManifest>;
  const list = Array.isArray(source.promos_bancarias) ? source.promos_bancarias : [];
  const promos_bancarias = list
    .map((item) => normalizeItem(item))
    .filter((item): item is PromoBancariaItem => item !== null);

  const header =
    typeof source.header === 'string' && source.header.trim()
      ? source.header.trim()
      : 'Promos que podés usar HOY';

  return {
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
    fecha: typeof source.fecha === 'string' ? source.fecha : '',
    diaSemana: typeof source.diaSemana === 'number' ? source.diaSemana : 0,
    diaLabel: typeof source.diaLabel === 'string' ? source.diaLabel : '',
    header,
    timezone: typeof source.timezone === 'string' ? source.timezone : undefined,
    promos_bancarias,
  };
}

/** ¿La promo aplica a la zona (provincia y/o supers visibles)? */
export function promoAppliesToZone(
  promo: PromoBancariaItem,
  zoneSetting: string | null
): boolean {
  if (promo.ambito === 'provinces') {
    const { key } = resolveProvince(zoneSetting);
    if (promo.provincias.length > 0 && !promo.provincias.includes(key)) {
      return false;
    }
  }

  if (promo.supers.length === 0) {
    // Genérica (ej. Cuenta DNI adheridos): ya pasó filtro de provincia
    return true;
  }

  return promo.supers.some((id) => isSupermarketAvailableInZone(id, zoneSetting));
}

/**
 * Solo lo útil HOY en la zona, priorizando lo que vence en las próximas 24h.
 */
export function filterPromosForZone(
  manifest: PromosBancariasManifest,
  zoneSetting: string | null
): PromosBancariasManifest {
  const promos_bancarias = [...manifest.promos_bancarias]
    .filter((p) => promoAppliesToZone(p, zoneSetting))
    .sort((a, b) => {
      // Con aplicaHoy del bot: hoy primero. Si no viene, fallback a enProximas24h.
      if (a.aplicaHoy !== undefined || b.aplicaHoy !== undefined) {
        if (Boolean(a.aplicaHoy) !== Boolean(b.aplicaHoy)) {
          return a.aplicaHoy ? -1 : 1;
        }
      } else if (a.enProximas24h !== b.enProximas24h) {
        return a.enProximas24h ? 1 : -1;
      }
      if (a.venceEnHoras !== b.venceEnHoras) return a.venceEnHoras - b.venceEnHoras;
      return (b.prioridad ?? 0) - (a.prioridad ?? 0);
    });

  return { ...manifest, promos_bancarias };
}

export async function fetchPromosBancariasManifest(options?: {
  forceRefresh?: boolean;
}): Promise<{ manifest: PromosBancariasManifest; fromRemote: boolean }> {
  if (!options?.forceRefresh && cachedManifest && usedRemoteManifest) {
    return { manifest: cachedManifest, fromRemote: true };
  }

  try {
    const json = await fetchRemoteJson(
      PROMOS_BANCARIAS_GIST_URL,
      PROMOS_BANCARIAS_FETCH_TIMEOUT_MS,
      'Promos bancarias'
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

export function getStartupPromosBancariasManifest(): PromosBancariasManifest | null {
  return cachedManifest;
}

export function clearPromosBancariasCacheForTests(): void {
  cachedManifest = null;
  usedRemoteManifest = false;
}

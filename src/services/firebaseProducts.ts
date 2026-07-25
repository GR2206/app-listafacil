import { collection, doc, getDoc, getDocs, limit, query, where } from 'firebase/firestore';

import {
  buildEanLookupSequence,
  normalizarEAN,
  normalizeBarcode,
  type EanCleanupRound,
  type EanNormalizationResult,
} from '@/utils/eanLookup';

export { normalizeBarcode, barcodeLookupVariants } from '@/utils/eanLookup';

import { db } from '../../firebaseConfig.js';

import type { AppProvince } from '@/config/provinces';
import type { Product } from '@/types';
import { getActivePriceProvince } from '@/services/priceProvince';
import { logPriceAudit } from '@/utils/priceAuditLog';
import {
  dropCrossMarketPriceOutliers,
  isPlausibleUnitPrice,
  SUPERMARKET_PRICE_ALIASES,
  supermarketPriceKeys,
} from '@/utils/supermarketPrices';

const COLLECTION = 'Productos';

function parsePriceValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    const rounded = Math.round(value);
    return isPlausibleUnitPrice(rounded) ? rounded : null;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) {
      const rounded = Math.round(parsed);
      return isPlausibleUnitPrice(rounded) ? rounded : null;
    }
  }

  return null;
}



/**
 * Precios planos (compat) + bucket provincial si existe.
 * Prioridad: PreciosProvincias[provincia][super] -> Precios[super].
 */
function extractFlatPreciosMap(data: Record<string, unknown>): Record<string, unknown> {
  const map: Record<string, unknown> = {};

  const nested = data.Precios ?? data.precios ?? data.prices;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    Object.assign(map, nested as Record<string, unknown>);
  }

  for (const [key, value] of Object.entries(data)) {
    if (key.startsWith('Precios.')) {
      map[key.slice('Precios.'.length)] = value;
    }
    if (key.startsWith('precios.')) {
      map[key.slice('precios.'.length)] = value;
    }
  }

  return map;
}

function extractProvincePreciosMap(
  data: Record<string, unknown>,
  province: AppProvince | null | undefined
): Record<string, unknown> | null {
  if (!province) return null;

  const root =
    data.PreciosProvincias ?? data.preciosProvincias ?? data.precios_provincias;
  if (!root || typeof root !== 'object' || Array.isArray(root)) return null;

  const bucket = (root as Record<string, unknown>)[province];
  if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) return null;

  return bucket as Record<string, unknown>;
}

function extractPreciosMap(
  data: Record<string, unknown>,
  province?: AppProvince | null
): Record<string, unknown> {
  const flat = extractFlatPreciosMap(data);
  const byProvince = extractProvincePreciosMap(data, province);
  if (!byProvince) return flat;
  return { ...flat, ...byProvince };
}

function readPriceForSupermarket(
  data: Record<string, unknown>,
  supermarketId: string,
  province?: AppProvince | null
): number | null {
  const provinceMap = extractProvincePreciosMap(data, province);
  const flatMap = extractFlatPreciosMap(data);
  const keys = supermarketPriceKeys(supermarketId);

  const tryMap = (
    map: Record<string, unknown>,
    source: 'PreciosProvincias' | 'Precios'
  ): number | null => {
    for (const key of keys) {
      const price = parsePriceValue(map[key]);
      if (price != null) {
        logPriceAudit('Firestore', {
          supermarketId,
          matchedKey: key,
          price,
          source,
          province: province ?? undefined,
        });
        return price;
      }
    }
    return null;
  };

  if (provinceMap) {
    const fromProvince = tryMap(provinceMap, 'PreciosProvincias');
    if (fromProvince != null) return fromProvince;
  }

  const fromFlat = tryMap(flatMap, 'Precios');
  if (fromFlat != null) return fromFlat;

  for (const key of keys) {
    const flat = parsePriceValue(data[`Precios.${key}`]);
    if (flat != null) {
      logPriceAudit('Firestore', {
        supermarketId,
        matchedKey: `Precios.${key}`,
        price: flat,
        source: 'flat',
      });
      return flat;
    }
  }

  logPriceAudit('Firestore', {
    supermarketId,
    price: null,
    province: province ?? undefined,
    availablePrecioKeys: Object.keys(extractPreciosMap(data, province)),
    note: 'Sin precio para este super — no se usa Precio/precio/price global',
  });

  return null;
}

function readSyncTimeForSupermarket(
  data: Record<string, unknown>,
  supermarketId: string
): string | null {
  const keys = supermarketPriceKeys(supermarketId);

  for (const key of keys) {
    const underscore = key.replace(/-/g, '_');
    const candidates = [
      data[`last_updated_timestamp_${underscore}`],
      data[`last_updated_timestamp_${key}`],
      data.last_updated_timestamp,
      data.lastUpdatedTimestamp,
      data[`scrapedAt_${underscore}`],
      data[`scrapedAt_${key}`],
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim()) return value;
      if (
        value &&
        typeof value === 'object' &&
        'toDate' in value &&
        typeof (value as { toDate: () => Date }).toDate === 'function'
      ) {
        return (value as { toDate: () => Date }).toDate().toISOString();
      }
    }
  }

  const globalUpdated =
    data.actualizadoEn ?? data.updatedAt ?? data.actualizado_en ?? data.updated_at;

  if (
    globalUpdated &&
    typeof globalUpdated === 'object' &&
    'toDate' in globalUpdated &&
    typeof (globalUpdated as { toDate: () => Date }).toDate === 'function'
  ) {
    return (globalUpdated as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof globalUpdated === 'string' && globalUpdated.trim()) {
    return globalUpdated;
  }

  return null;
}

/** Precios de todos los supers (provincia activa si hay bucket; si no, Precios plano). */
export function extractCatalogPricesFromFirestore(
  data: Record<string, unknown>,
  province?: AppProvince | null
): {
  prices: Record<string, number>;
  syncedAt: Record<string, string>;
} {
  const prices: Record<string, number> = {};
  const syncedAt: Record<string, string> = {};

  for (const supermarketId of Object.keys(SUPERMARKET_PRICE_ALIASES)) {
    const price = readPriceForSupermarket(data, supermarketId, province);
    if (price == null || price <= 0) continue;

    prices[supermarketId] = price;

    const syncTime = readSyncTimeForSupermarket(data, supermarketId);
    if (syncTime) {
      syncedAt[supermarketId] = syncTime;
    }
  }

  const cleaned = dropCrossMarketPriceOutliers(prices);
  const cleanedSynced: Record<string, string> = {};
  for (const supermarketId of Object.keys(cleaned)) {
    if (syncedAt[supermarketId]) cleanedSynced[supermarketId] = syncedAt[supermarketId];
  }

  return { prices: cleaned, syncedAt: cleanedSynced };
}

function mapFirestoreDoc(
  barcode: string,
  data: Record<string, unknown>,
  supermarketId: string,
  province?: AppProvince | null
): Product | null {
  const name =
    (data.Nombre as string) ??
    (data.nombre as string) ??
    (data.name as string) ??
    '';

  if (!name.trim()) return null;

  const imageUrl =
    (data.Imagen as string) ??
    (data.imagen as string) ??
    (data.imageUrl as string) ??
    (data.image as string) ??
    undefined;

  const price = readPriceForSupermarket(data, supermarketId, province);
  const catalogPrices = extractCatalogPricesFromFirestore(data, province);

  return {
    id: barcode,
    barcode,
    name: name.trim(),
    brand: (data.Marca as string) ?? (data.marca as string) ?? (data.brand as string),
    imageUrl,
    price: price ?? 0,
    supermarketId,
    updatedAt: new Date().toISOString(),
    priceSyncedAt: readSyncTimeForSupermarket(data, supermarketId) ?? undefined,
    catalogPrices,
  };
}

async function readProductDoc(
  candidate: string,
  supermarketId: string,
  province?: AppProvince | null
): Promise<Product | null> {
  const ref = doc(db, COLLECTION, candidate);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;

  const data = snapshot.data() as Record<string, unknown>;
  const activeProvince = province ?? (await getActivePriceProvince());
  const product = mapFirestoreDoc(candidate, data, supermarketId, activeProvince);
  if (!product) return null;

  logPriceAudit('FirestoreLookup', {
    barcode: candidate,
    supermarketId,
    province: activeProvince,
    price: product.price > 0 ? product.price : null,
    productName: product.name,
  });

  return product;
}

function normalizeNameForMatch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function scoreNameMatch(productName: string, hint: string): number {
  const name = normalizeNameForMatch(productName);
  const term = normalizeNameForMatch(hint);
  if (!name || !term) return 0;
  if (name === term) return 100;
  if (name.startsWith(term)) return 80;
  if (name.includes(term)) return 60;

  const tokens = term.split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length <= 1) return 0;
  const hit = tokens.filter((t) => name.includes(t)).length;
  if (hit === tokens.length) return 55;
  if (hit > 0) return 25 + hit * 8;
  return 0;
}

async function queryProductsByNameField(
  field: string,
  nameHint: string,
  supermarketId: string,
  mode: 'exact' | 'prefix',
  province?: AppProvince | null
): Promise<Product[]> {
  const term = nameHint.trim();
  if (term.length < 2) return [];

  const constraints =
    mode === 'exact'
      ? [where(field, '==', term), limit(8)]
      : [where(field, '>=', term), where(field, '<=', `${term}\uf8ff`), limit(12)];

  const snapshot = await getDocs(query(collection(db, COLLECTION), ...constraints));
  const products: Product[] = [];
  const activeProvince = province ?? (await getActivePriceProvince());

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() as Record<string, unknown>;
    const product = mapFirestoreDoc(docSnap.id, data, supermarketId, activeProvince);
    if (product) products.push(product);
  }

  return products;
}

function rankProductsByName(matches: Product[], term: string): Product[] {
  const seen = new Set<string>();

  return [...matches]
    .map((product) => ({
      product,
      score: scoreNameMatch(product.name, term),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .filter((entry) => {
      if (seen.has(entry.product.id)) return false;
      seen.add(entry.product.id);
      return true;
    })
    .map((entry) => entry.product);
}

export async function searchProductCandidatesByName(
  nameHint: string,
  supermarketId: string,
  maxResults = 8
): Promise<Product[]> {
  const term = nameHint.trim();
  if (term.length < 2) return [];

  try {
    const fields = ['Nombre', 'nombre', 'name'];
    const matches: Product[] = [];
    const province = await getActivePriceProvince();

    for (const field of fields) {
      for (const mode of ['exact', 'prefix'] as const) {
        try {
          const found = await queryProductsByNameField(
            field,
            term,
            supermarketId,
            mode,
            province
          );
          matches.push(...found);
        } catch {
          // Índice faltante en un campo: continuar con el siguiente.
        }
      }
    }

    return rankProductsByName(matches, term).slice(0, maxResults);
  } catch (error) {
    console.warn('[Firestore] Error al buscar por nombre:', error);
    return [];
  }
}

export async function searchProductsByNameInFirestore(
  nameHint: string,
  supermarketId: string
): Promise<Product | null> {
  const term = nameHint.trim();
  if (term.length < 3) return null;

  const ranked = await searchProductCandidatesByName(term, supermarketId, 1);
  return ranked[0] ?? null;
}

export async function fetchProductByDocId(
  productDocId: string,
  supermarketId: string
): Promise<Product | null> {
  const id = productDocId.trim();
  if (!id) return null;
  return readProductDoc(id, supermarketId);
}

export interface EanLookupAttempt {
  rounds: EanCleanupRound[];
  matchedBarcode: string | null;
  scannedEan?: string;
  prefixStripped?: boolean;
  prefixChar?: '5' | '0';
}

/** Busca un producto por ID de documento EAN en Firestore. */
export async function buscarPorEAN(ean: string, supermarketId: string): Promise<Product | null> {
  const digits = ean.replace(/\D/g, '');
  if (!digits) return null;
  return readProductDoc(digits, supermarketId);
}

async function buscarConSecuenciaEAN(
  norm: EanNormalizationResult,
  supermarketId: string,
  tried: Set<string>
): Promise<{ product: Product; matchedBarcode: string; prefixStripped: boolean } | null> {
  const [primary, fallback] = norm.lookupSequence;

  if (primary && !tried.has(primary)) {
    tried.add(primary);
    const producto = await buscarPorEAN(primary, supermarketId);
    if (producto) {
      return { product: producto, matchedBarcode: primary, prefixStripped: false };
    }
  }

  if (fallback && !tried.has(fallback)) {
    tried.add(fallback);
    const producto = await buscarPorEAN(fallback, supermarketId);
    if (producto) {
      const prefixStripped = Boolean(primary && fallback !== primary);
      return { product: producto, matchedBarcode: fallback, prefixStripped };
    }
  }

  for (const candidate of norm.lookupSequence.slice(2)) {
    if (tried.has(candidate)) continue;
    tried.add(candidate);
    const producto = await buscarPorEAN(candidate, supermarketId);
    if (producto) {
      return {
        product: producto,
        matchedBarcode: candidate,
        prefixStripped: candidate !== norm.scanned,
      };
    }
  }

  return null;
}

export async function fetchProductWithEanCleanup(
  rawBarcode: string,
  supermarketId: string
): Promise<{ product: Product | null; attempt: EanLookupAttempt }> {
  const rounds = buildEanLookupSequence(rawBarcode);
  const tried = new Set<string>();
  const norm = normalizarEAN(rawBarcode);

  try {
    if (norm) {
      const quick = await buscarConSecuenciaEAN(norm, supermarketId, tried);
      if (quick) {
        return {
          product: quick.product,
          attempt: {
            rounds,
            matchedBarcode: quick.matchedBarcode,
            scannedEan: norm.scanned,
            prefixStripped: quick.prefixStripped,
            prefixChar: norm.prefixChar,
          },
        };
      }
    }

    for (const round of rounds) {
      for (const candidate of round.candidates) {
        if (tried.has(candidate)) continue;
        tried.add(candidate);

        const product = await buscarPorEAN(candidate, supermarketId);
        if (product) {
          const prefixStripped = Boolean(
            norm && candidate !== norm.scanned && norm.lookupSequence.includes(candidate)
          );

          return {
            product,
            attempt: {
              rounds,
              matchedBarcode: candidate,
              scannedEan: norm?.scanned,
              prefixStripped,
              prefixChar: norm?.prefixChar,
            },
          };
        }
      }
    }

    const normalized = normalizeBarcode(rawBarcode);
    if (normalized) {
      console.warn(`[Firestore] Sin documento Productos/${normalized} tras ${rounds.length} rondas EAN`);
    }

    return {
      product: null,
      attempt: {
        rounds,
        matchedBarcode: null,
        scannedEan: norm?.scanned,
      },
    };
  } catch (error) {
    const code = (error as { code?: string })?.code;

    if (code === 'permission-denied') {
      console.error(
        '[Firestore] Permiso denegado. En Firebase Console → Firestore → Reglas, permití lectura de Productos.'
      );
    } else {
      console.warn('[Firestore] Error al buscar producto:', error);
    }

    return {
      product: null,
      attempt: { rounds, matchedBarcode: null },
    };
  }
}

export async function fetchProductFromFirestore(
  barcode: string,
  supermarketId: string
): Promise<Product | null> {
  const { product } = await fetchProductWithEanCleanup(barcode, supermarketId);
  return product;
}



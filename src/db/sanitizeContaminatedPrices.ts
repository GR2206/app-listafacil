import type { SQLiteDatabase } from 'expo-sqlite';

import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import {
  mergeSupermarketPrice,
  mergeSupermarketSyncTime,
  parsePricesJson,
  parseSyncedAtJson,
  readPriceForSupermarket,
  supermarketPriceKeys,
  SUPERMARKET_PRICE_ALIASES,
} from '@/utils/supermarketPrices';
import { logPriceAudit } from '@/utils/priceAuditLog';

export const SANITIZE_CONTAMINATED_PRICES_MIGRATION = 'sanitize_contaminated_prices_v1';
export const SANITIZE_CONTAMINATED_PRICES_MIGRATION_V2 = 'sanitize_contaminated_prices_v2';

export interface SanitizeContaminatedPricesResult {
  scanned: number;
  updated: number;
  strippedEntries: number;
  details: Array<{
    barcode: string;
    keptSupers: string[];
    removedSupers: string[];
    reason: string;
  }>;
}

type ProductRowForSanitize = {
  id: string;
  barcode: string;
  price: number;
  supermarket_id: string;
  prices_json: string | null;
  prices_synced_at_json: string | null;
};

const KNOWN_SUPER_IDS = MOCK_SUPERMARKETS.map((s) => s.id);

function canonicalSupermarketIdForKey(key: string): string | null {
  const normalized = key.trim();
  if (!normalized) return null;

  for (const superId of KNOWN_SUPER_IDS) {
    if (supermarketPriceKeys(superId).includes(normalized)) {
      return superId;
    }
  }

  const hyphen = normalized.replace(/_/g, '-').toLowerCase();
  const underscore = normalized.replace(/-/g, '_').toLowerCase();

  for (const superId of KNOWN_SUPER_IDS) {
    if (superId === hyphen || superId.replace(/-/g, '_') === underscore) {
      return superId;
    }
  }

  if (SUPERMARKET_PRICE_ALIASES[normalized]) {
    return normalized;
  }

  return null;
}

function groupPricesBySupermarket(
  pricesMap: Record<string, number>
): Record<string, number> {
  const grouped: Record<string, number> = {};

  for (const [key, rawPrice] of Object.entries(pricesMap)) {
    if (rawPrice <= 0) continue;

    const superId = canonicalSupermarketIdForKey(key);
    if (!superId) continue;

    if (grouped[superId] == null) {
      grouped[superId] = Math.round(rawPrice);
    }
  }

  return grouped;
}

function groupSyncedAtBySupermarket(
  syncedMap: Record<string, string>
): Record<string, string> {
  const grouped: Record<string, string> = {};

  for (const [key, syncedAt] of Object.entries(syncedMap)) {
    if (!syncedAt.trim()) continue;

    const superId = canonicalSupermarketIdForKey(key);
    if (!superId) continue;

    const existing = grouped[superId];
    if (!existing || syncedAt > existing) {
      grouped[superId] = syncedAt;
    }
  }

  return grouped;
}

function rebuildAliasMaps(
  pricesBySuper: Record<string, number>,
  syncedBySuper: Record<string, string>
): { prices: Record<string, number>; syncedAt: Record<string, string> } {
  let prices: Record<string, number> = {};
  let syncedAt: Record<string, string> = {};

  for (const [superId, price] of Object.entries(pricesBySuper)) {
    if (price <= 0) continue;
    prices = mergeSupermarketPrice(prices, superId, price);

    const synced = syncedBySuper[superId];
    if (synced) {
      syncedAt = mergeSupermarketSyncTime(syncedAt, superId, synced);
    }
  }

  return { prices, syncedAt };
}

/**
 * Detecta precios idénticos copiados entre supers (bug del fallback global)
 * y conserva solo los que tienen respaldo de sincronización o del último escaneo.
 */
export function sanitizeContaminatedPriceMaps(
  pricesMap: Record<string, number>,
  syncedMap: Record<string, string>,
  rowSupermarketId: string
): {
  prices: Record<string, number>;
  syncedAt: Record<string, string>;
  changed: boolean;
  keptSupers: string[];
  removedSupers: string[];
  reason: string;
} {
  const pricesBySuper = groupPricesBySupermarket(pricesMap);
  const syncedBySuper = groupSyncedAtBySupermarket(syncedMap);

  const supersWithPrice = Object.keys(pricesBySuper).filter((id) => pricesBySuper[id] > 0);

  if (supersWithPrice.length <= 1) {
    const rebuilt = rebuildAliasMaps(pricesBySuper, syncedBySuper);
    const changed =
      JSON.stringify(rebuilt.prices) !== JSON.stringify(pricesMap) ||
      JSON.stringify(rebuilt.syncedAt) !== JSON.stringify(syncedMap);

    return {
      ...rebuilt,
      changed,
      keptSupers: supersWithPrice,
      removedSupers: [],
      reason: changed ? 'normalizacion_alias' : 'sin_cambios',
    };
  }

  const uniquePriceValues = new Set(supersWithPrice.map((id) => pricesBySuper[id]));

  if (uniquePriceValues.size > 1) {
    const rebuilt = rebuildAliasMaps(pricesBySuper, syncedBySuper);
    return {
      ...rebuilt,
      changed:
        JSON.stringify(rebuilt.prices) !== JSON.stringify(pricesMap) ||
        JSON.stringify(rebuilt.syncedAt) !== JSON.stringify(syncedMap),
      keptSupers: supersWithPrice,
      removedSupers: [],
      reason: 'precios_distintos_ok',
    };
  }

  const toRemove = new Set<string>();
  let keepSuper = supersWithPrice[0];
  let reason = 'copia_global_detectada';

  if (rowSupermarketId && pricesBySuper[rowSupermarketId] > 0) {
    keepSuper = rowSupermarketId;
    reason = 'copia_global_ultimo_escaneo';
  } else {
    keepSuper = supersWithPrice.reduce((best, superId) => {
      const ts = syncedBySuper[superId] ?? '';
      const bestTs = syncedBySuper[best] ?? '';
      return ts > bestTs ? superId : best;
    }, supersWithPrice[0]);
    reason = 'copia_global_sync_mas_reciente';
  }

  for (const superId of supersWithPrice) {
    if (superId !== keepSuper) toRemove.add(superId);
  }

  const cleanedBySuper: Record<string, number> = {};
  const cleanedSyncedBySuper: Record<string, string> = {};

  for (const superId of supersWithPrice) {
    if (toRemove.has(superId)) continue;
    cleanedBySuper[superId] = pricesBySuper[superId];
    if (syncedBySuper[superId]) {
      cleanedSyncedBySuper[superId] = syncedBySuper[superId];
    }
  }

  const rebuilt = rebuildAliasMaps(cleanedBySuper, cleanedSyncedBySuper);

  return {
    ...rebuilt,
    changed: toRemove.size > 0 || JSON.stringify(rebuilt.prices) !== JSON.stringify(pricesMap),
    keptSupers: Object.keys(cleanedBySuper),
    removedSupers: [...toRemove],
    reason,
  };
}

export async function sanitizeContaminatedPricesInDatabase(
  database: SQLiteDatabase
): Promise<SanitizeContaminatedPricesResult> {
  const rows = await database.getAllAsync<ProductRowForSanitize>(
    `SELECT id, barcode, price, supermarket_id, prices_json, prices_synced_at_json
     FROM products
     WHERE prices_json IS NOT NULL AND prices_json != ''`
  );

  const result: SanitizeContaminatedPricesResult = {
    scanned: rows.length,
    updated: 0,
    strippedEntries: 0,
    details: [],
  };

  for (const row of rows) {
    const pricesMap = parsePricesJson(row.prices_json);
    const syncedMap = parseSyncedAtJson(row.prices_synced_at_json);
    const sanitized = sanitizeContaminatedPriceMaps(
      pricesMap,
      syncedMap,
      row.supermarket_id
    );

    if (!sanitized.changed) continue;

    const resolvedPrice = readPriceForSupermarket(sanitized.prices, row.supermarket_id, 0);

    await database.runAsync(
      `UPDATE products
       SET prices_json = ?, prices_synced_at_json = ?, price = ?
       WHERE id = ?`,
      [
        JSON.stringify(sanitized.prices),
        JSON.stringify(sanitized.syncedAt),
        resolvedPrice,
        row.id,
      ]
    );

    result.updated += 1;
    result.strippedEntries += sanitized.removedSupers.length;
    result.details.push({
      barcode: row.barcode,
      keptSupers: sanitized.keptSupers,
      removedSupers: sanitized.removedSupers,
      reason: sanitized.reason,
    });

    logPriceAudit('Cleanup', {
      barcode: row.barcode,
      reason: sanitized.reason,
      keptSupers: sanitized.keptSupers,
      removedSupers: sanitized.removedSupers,
      beforeKeys: Object.keys(pricesMap),
      afterKeys: Object.keys(sanitized.prices),
    });
  }

  console.log('[PriceAudit:CleanupSummary]', {
    scanned: result.scanned,
    updated: result.updated,
    strippedEntries: result.strippedEntries,
  });

  return result;
}

import * as SQLite from 'expo-sqlite';
import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';
import type { CartLine, Product } from '@/types';
import {
  mergeSupermarketPrice,
  mergeSupermarketSyncTime,
  parsePricesJson,
  parseSyncedAtJson,
  readPriceForSupermarket,
  supermarketPriceKeys,
} from '@/utils/supermarketPrices';
import { logPriceAudit } from '@/utils/priceAuditLog';
import {
  SANITIZE_CONTAMINATED_PRICES_MIGRATION,
  SANITIZE_CONTAMINATED_PRICES_MIGRATION_V2,
  sanitizeContaminatedPriceMaps,
  sanitizeContaminatedPricesInDatabase,
  type SanitizeContaminatedPricesResult,
} from '@/db/sanitizeContaminatedPrices';

const DB_NAME = 'lista_facil.db';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  price REAL NOT NULL,
  supermarket_id TEXT NOT NULL,
  updated_at TEXT,
  prices_json TEXT,
  prices_synced_at_json TEXT,
  UNIQUE (barcode, supermarket_id)
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode, supermarket_id);

CREATE TABLE IF NOT EXISTS cart_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  supermarket_id TEXT NOT NULL,
  supermarket_name TEXT NOT NULL,
  started_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  product_id TEXT,
  barcode TEXT NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT,
  unit_price REAL NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  scanned_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_cart_items_session ON cart_items (session_id);

CREATE TABLE IF NOT EXISTS price_reports (
  id TEXT PRIMARY KEY NOT NULL,
  cart_item_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  barcode TEXT NOT NULL,
  supermarket_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  previous_price REAL NOT NULL,
  reported_price REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merchant_analytics_events (
  id TEXT PRIMARY KEY NOT NULL,
  supermarket_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  visitor_id TEXT,
  product_barcode TEXT,
  product_name TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_merchant_analytics_lookup
  ON merchant_analytics_events (supermarket_id, event_type, created_at);

CREATE TABLE IF NOT EXISTS precios_usuario (
  barcode TEXT NOT NULL,
  supermarket_id TEXT NOT NULL,
  unit_price REAL NOT NULL,
  updated_at TEXT NOT NULL,
  scrape_snapshot_at TEXT,
  PRIMARY KEY (barcode, supermarket_id)
);
CREATE INDEX IF NOT EXISTS idx_precios_usuario_super ON precios_usuario (supermarket_id);

CREATE TABLE IF NOT EXISTS completed_purchases (
  id TEXT PRIMARY KEY NOT NULL,
  supermarket_id TEXT NOT NULL,
  supermarket_name TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  total REAL NOT NULL,
  item_count INTEGER NOT NULL,
  list_savings REAL NOT NULL DEFAULT 0,
  items_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_completed_purchases_date
  ON completed_purchases (completed_at DESC);

CREATE TABLE IF NOT EXISTS app_migrations (
  id TEXT PRIMARY KEY NOT NULL,
  applied_at TEXT NOT NULL
);
`;

let db: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openAndMigrateDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(DB_NAME);
  await database.execAsync(SCHEMA);
  await migrateDatabase(database);
  return database;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;

  if (!dbInitPromise) {
    dbInitPromise = openAndMigrateDatabase()
      .then((database) => {
        db = database;
        return database;
      })
      .catch((error) => {
        dbInitPromise = null;
        throw error;
      });
  }

  return dbInitPromise;
}

export function sessionIdFor(supermarketId: string): string {
  return `session-${supermarketId}`;
}

export interface CartSessionRecord {
  id: string;
  supermarketId: string;
  supermarketName: string;
  startedAt: string;
}

export async function saveCartSession(session: CartSessionRecord): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`UPDATE cart_sessions SET is_active = 0`);
  await database.runAsync(
    `INSERT INTO cart_sessions (id, supermarket_id, supermarket_name, started_at, is_active)
     VALUES (?, ?, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET
       supermarket_name = excluded.supermarket_name,
       started_at = excluded.started_at,
       is_active = 1`,
    [session.id, session.supermarketId, session.supermarketName, session.startedAt]
  );
}

export async function getActiveCartSession(): Promise<CartSessionRecord | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    supermarket_id: string;
    supermarket_name: string;
    started_at: string;
  }>(`SELECT * FROM cart_sessions WHERE is_active = 1 ORDER BY started_at DESC LIMIT 1`);

  if (!row) return null;

  return {
    id: row.id,
    supermarketId: row.supermarket_id,
    supermarketName: row.supermarket_name,
    startedAt: row.started_at,
  };
}

type ProductRow = {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  price: number;
  supermarket_id: string;
  updated_at: string | null;
  prices_json: string | null;
  prices_synced_at_json: string | null;
};

export interface ProductPriceMeta {
  prices: Record<string, number>;
  syncedAt: Record<string, string>;
}

function mergePricesFromRow(
  pricesMap: Record<string, number>,
  row: Pick<ProductRow, 'price' | 'supermarket_id' | 'prices_json'>
): Record<string, number> {
  const merged = { ...pricesMap, ...parsePricesJson(row.prices_json) };

  if (row.price > 0 && row.supermarket_id) {
    for (const key of supermarketPriceKeys(row.supermarket_id)) {
      merged[key] = Math.round(row.price);
    }
  }

  return merged;
}

function getSanitizedPriceMetaFromRow(
  row: Pick<
    ProductRow,
    'price' | 'supermarket_id' | 'prices_json' | 'prices_synced_at_json'
  > & { updated_at?: string | null }
): ProductPriceMeta {
  const rawPrices = mergePricesFromRow({}, row);
  const rawSyncedAt = mergeSyncedAtFromRow({}, row);
  const sanitized = sanitizeContaminatedPriceMaps(
    rawPrices,
    rawSyncedAt,
    row.supermarket_id
  );

  return {
    prices: sanitized.prices,
    syncedAt: sanitized.syncedAt,
  };
}

function mergeSyncedAtFromRow(
  syncedAtMap: Record<string, string>,
  row: Pick<ProductRow, 'supermarket_id' | 'prices_synced_at_json'> & {
    updated_at?: string | null;
  }
): Record<string, string> {
  let merged = { ...syncedAtMap, ...parseSyncedAtJson(row.prices_synced_at_json) };

  if (row.updated_at && row.supermarket_id) {
    merged = mergeSupermarketSyncTime(merged, row.supermarket_id, row.updated_at);
  }

  return merged;
}

async function mergeDuplicateBarcodeRows(
  database: SQLite.SQLiteDatabase,
  barcode: string
): Promise<void> {
  const rows = await database.getAllAsync<ProductRow>(
    `SELECT * FROM products WHERE barcode = ?`,
    [barcode]
  );

  if (rows.length <= 1) return;

  let pricesMap: Record<string, number> = {};
  let syncedAtMap: Record<string, string> = {};
  let name = '';
  let brand: string | null = null;
  let imageUrl: string | null = null;
  let latestUpdated = '';
  let lastSupermarket = '';

  for (const row of rows) {
    pricesMap = mergePricesFromRow(pricesMap, row);
    syncedAtMap = mergeSyncedAtFromRow(syncedAtMap, row);
    if (row.name) name = row.name;
    if (row.brand) brand = row.brand;
    if (row.image_url) imageUrl = row.image_url;
    const updatedAt = row.updated_at ?? '';
    if (updatedAt >= latestUpdated) {
      latestUpdated = updatedAt;
      lastSupermarket = row.supermarket_id;
    }
  }

  await database.runAsync(`DELETE FROM products WHERE barcode = ?`, [barcode]);
  await database.runAsync(
    `INSERT INTO products (id, barcode, name, brand, image_url, price, supermarket_id, updated_at, prices_json, prices_synced_at_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      barcode,
      barcode,
      name,
      brand,
      imageUrl,
      readPriceForSupermarket(pricesMap, lastSupermarket),
      lastSupermarket,
      latestUpdated || new Date().toISOString(),
      JSON.stringify(pricesMap),
      JSON.stringify(syncedAtMap),
    ]
  );
}

async function hasMigration(database: SQLite.SQLiteDatabase, id: string): Promise<boolean> {
  const row = await database.getFirstAsync<{ id: string }>(
    `SELECT id FROM app_migrations WHERE id = ?`,
    [id]
  );
  return Boolean(row?.id);
}

async function markMigrationApplied(database: SQLite.SQLiteDatabase, id: string): Promise<void> {
  await database.runAsync(
    `INSERT OR IGNORE INTO app_migrations (id, applied_at) VALUES (?, ?)`,
    [id, new Date().toISOString()]
  );
}

async function migrateDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  const cartColumns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(cart_items)`
  );
  const hasScannedAt = cartColumns.some((c) => c.name === 'scanned_at');
  if (!hasScannedAt) {
    await database.execAsync(`ALTER TABLE cart_items ADD COLUMN scanned_at INTEGER`);
  }

  const productColumns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(products)`
  );
  const hasPricesJson = productColumns.some((c) => c.name === 'prices_json');
  if (!hasPricesJson) {
    await database.execAsync(`ALTER TABLE products ADD COLUMN prices_json TEXT`);
  }

  const hasSyncedAtJson = productColumns.some((c) => c.name === 'prices_synced_at_json');
  if (!hasSyncedAtJson) {
    await database.execAsync(`ALTER TABLE products ADD COLUMN prices_synced_at_json TEXT`);
  }

  const merchantColumns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(merchant_analytics_events)`
  );
  if (merchantColumns.length > 0) {
    if (!merchantColumns.some((c) => c.name === 'product_barcode')) {
      await database.execAsync(
        `ALTER TABLE merchant_analytics_events ADD COLUMN product_barcode TEXT`
      );
    }
    if (!merchantColumns.some((c) => c.name === 'product_name')) {
      await database.execAsync(
        `ALTER TABLE merchant_analytics_events ADD COLUMN product_name TEXT`
      );
    }
  }

  const duplicateBarcodes = await database.getAllAsync<{ barcode: string }>(
    `SELECT barcode FROM products GROUP BY barcode HAVING COUNT(*) > 1`
  );

  for (const row of duplicateBarcodes) {
    await mergeDuplicateBarcodeRows(database, row.barcode);
  }

  const rowsMissingPrices = await database.getAllAsync<ProductRow>(
    `SELECT * FROM products WHERE prices_json IS NULL OR prices_json = ''`
  );

  for (const row of rowsMissingPrices) {
    const pricesMap = mergePricesFromRow({}, row);
    const canonicalId = row.barcode;

    await database.runAsync(
      `UPDATE products
       SET id = ?, prices_json = ?
       WHERE id = ?`,
      [canonicalId, JSON.stringify(pricesMap), row.id]
    );
  }

  if (!(await hasMigration(database, SANITIZE_CONTAMINATED_PRICES_MIGRATION))) {
    await sanitizeContaminatedPricesInDatabase(database);
    await markMigrationApplied(database, SANITIZE_CONTAMINATED_PRICES_MIGRATION);
  }

  if (!(await hasMigration(database, SANITIZE_CONTAMINATED_PRICES_MIGRATION_V2))) {
    await sanitizeContaminatedPricesInDatabase(database);
    await markMigrationApplied(database, SANITIZE_CONTAMINATED_PRICES_MIGRATION_V2);
  }
}

/**
 * Limpia precios copiados entre supers en SQLite local.
 * Por defecto solo corre si la migración v1 aún no se aplicó; con `force: true` re-ejecuta.
 */
export async function runContaminatedPricesCleanup(options?: {
  force?: boolean;
}): Promise<SanitizeContaminatedPricesResult> {
  const database = await getDatabase();

  const result = await sanitizeContaminatedPricesInDatabase(database);

  if (!options?.force) {
    await markMigrationApplied(database, SANITIZE_CONTAMINATED_PRICES_MIGRATION_V2);
  }

  return result;
}

export async function getProductPriceMetaMaps(
  barcodes: string[]
): Promise<Record<string, ProductPriceMeta>> {
  const database = await getDatabase();
  const uniqueBarcodes = [...new Set(barcodes.filter(Boolean))];
  const maps: Record<string, ProductPriceMeta> = {};

  for (const barcode of uniqueBarcodes) {
    const row = await database.getFirstAsync<
      Pick<
        ProductRow,
        'price' | 'supermarket_id' | 'prices_json' | 'updated_at' | 'prices_synced_at_json'
      >
    >(
      `SELECT price, supermarket_id, prices_json, updated_at, prices_synced_at_json
       FROM products WHERE barcode = ? ORDER BY updated_at DESC LIMIT 1`,
      [barcode]
    );

    if (row) {
      const meta = getSanitizedPriceMetaFromRow(row);
      maps[barcode] = meta;
      logPriceAudit('SQLiteMeta', {
        barcode,
        rowSupermarketId: row.supermarket_id,
        scalarPrice: row.price,
        pricesJsonKeys: Object.keys(meta.prices),
        pricesBySuper: meta.prices,
      });
    } else {
      maps[barcode] = { prices: {}, syncedAt: {} };
    }
  }

  return maps;
}

export async function getProductPricesMaps(
  barcodes: string[]
): Promise<Record<string, Record<string, number>>> {
  const metaMaps = await getProductPriceMetaMaps(barcodes);
  const maps: Record<string, Record<string, number>> = {};

  for (const [barcode, meta] of Object.entries(metaMaps)) {
    maps[barcode] = meta.prices;
  }

  return maps;
}

export async function findProductByBarcode(
  barcode: string,
  supermarketId: string
): Promise<Product | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<ProductRow>(
    `SELECT * FROM products WHERE barcode = ? LIMIT 1`,
    [barcode]
  );

  if (!row) return null;

  const { prices: pricesMap } = getSanitizedPriceMetaFromRow(row);
  const resolvedPrice = readPriceForSupermarket(pricesMap, supermarketId, 0);

  logPriceAudit('SQLiteLookup', {
    barcode,
    requestedSupermarketId: supermarketId,
    rowSupermarketId: row.supermarket_id,
    resolvedPrice: resolvedPrice > 0 ? resolvedPrice : null,
    pricesJsonKeys: Object.keys(pricesMap),
  });

  return {
    id: row.barcode,
    barcode: row.barcode,
    name: row.name,
    brand: row.brand ?? undefined,
    imageUrl: row.image_url ?? undefined,
    price: resolvedPrice,
    supermarketId,
    updatedAt: row.updated_at ?? undefined,
  };
}

export interface LocalSimilarProductCandidate {
  barcode: string;
  name: string;
  brand?: string;
  unitPrice: number;
}

/**
 * Candidatos locales cuyo nombre contiene el token de búsqueda y tienen precio
 * en ese super. El filtrado fino por tipo de producto lo hace el caller.
 */
export async function findSimilarProductCandidatesLocal(options: {
  token: string;
  supermarketId: string;
  excludeBarcode?: string;
  requiredTokens?: string[];
  limit?: number;
}): Promise<LocalSimilarProductCandidate[]> {
  const token = options.token.trim().toLowerCase();
  if (token.length < 3) return [];

  const database = await getDatabase();
  const likeToken = token.includes(' ') ? token.split(/\s+/)[0] : token;
  const rows = await database.getAllAsync<ProductRow>(
    `SELECT * FROM products
     WHERE lower(name) LIKE ?
     ORDER BY updated_at DESC
     LIMIT ?`,
    [`%${likeToken}%`, options.limit ?? 100]
  );

  const required = (options.requiredTokens ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  const results: LocalSimilarProductCandidate[] = [];

  for (const row of rows) {
    if (options.excludeBarcode && row.barcode === options.excludeBarcode) continue;

    const nameLower = row.name.toLowerCase();
    if (!nameLower.includes(likeToken)) continue;
    if (required.length > 0 && !required.every((req) => nameLower.includes(req))) {
      continue;
    }

    const { prices } = getSanitizedPriceMetaFromRow(row);
    const unitPrice = readPriceForSupermarket(prices, options.supermarketId, 0);
    if (unitPrice <= 0) continue;

    results.push({
      barcode: row.barcode,
      name: row.name,
      brand: row.brand ?? undefined,
      unitPrice,
    });
  }

  return results;
}

/** @deprecated Preferir findSimilarProductCandidatesLocal + ranking por tipo. */
export async function findCheapestSimilarProductLocal(options: {
  token: string;
  supermarketId: string;
  excludeBarcode?: string;
  limit?: number;
}): Promise<LocalSimilarProductCandidate | null> {
  const rows = await findSimilarProductCandidatesLocal(options);
  if (rows.length === 0) return null;
  return rows.reduce((best, current) =>
    current.unitPrice < best.unitPrice ? current : best
  );
}

export async function upsertProduct(product: Product): Promise<void> {
  const database = await getDatabase();
  const canonicalId = product.barcode;
  const updatedAt = product.updatedAt ?? new Date().toISOString();

  const existing = await database.getFirstAsync<ProductRow>(
    `SELECT * FROM products WHERE id = ? OR barcode = ? LIMIT 1`,
    [canonicalId, canonicalId]
  );

  let pricesMap = existing ? mergePricesFromRow({}, existing) : {};
  let syncedAtMap = existing ? mergeSyncedAtFromRow({}, existing) : {};

  if (existing) {
    const sanitized = sanitizeContaminatedPriceMaps(
      pricesMap,
      syncedAtMap,
      existing.supermarket_id
    );
    pricesMap = sanitized.prices;
    syncedAtMap = sanitized.syncedAt;
  }

  if (product.catalogPrices) {
    for (const market of MOCK_SUPERMARKETS) {
      const price = product.catalogPrices.prices[market.id];
      if (price == null || price <= 0) continue;
      pricesMap = mergeSupermarketPrice(pricesMap, market.id, price);
      const syncedAt = product.catalogPrices.syncedAt[market.id];
      if (syncedAt) {
        syncedAtMap = mergeSupermarketSyncTime(syncedAtMap, market.id, syncedAt);
      }
    }
  }

  if (product.price > 0) {
    pricesMap = mergeSupermarketPrice(pricesMap, product.supermarketId, product.price);
    const syncedAt = product.priceSyncedAt ?? updatedAt;
    syncedAtMap = mergeSupermarketSyncTime(syncedAtMap, product.supermarketId, syncedAt);
  }

  const mergedName = product.name?.trim() || existing?.name || product.name;
  const mergedBrand = product.brand ?? existing?.brand ?? null;
  const mergedImage = product.imageUrl ?? existing?.image_url ?? null;
  const resolvedPrice = readPriceForSupermarket(pricesMap, product.supermarketId, 0);

  logPriceAudit('SQLiteUpsert', {
    barcode: product.barcode,
    supermarketId: product.supermarketId,
    incomingPrice: product.price > 0 ? product.price : null,
    resolvedPrice: resolvedPrice > 0 ? resolvedPrice : null,
    pricesJsonKeys: Object.keys(pricesMap),
    wrotePriceForSuper: product.price > 0,
  });

  await database.runAsync(
    `INSERT OR REPLACE INTO products (id, barcode, name, brand, image_url, price, supermarket_id, updated_at, prices_json, prices_synced_at_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      canonicalId,
      product.barcode,
      mergedName,
      mergedBrand,
      mergedImage,
      resolvedPrice,
      product.supermarketId,
      updatedAt,
      JSON.stringify(pricesMap),
      JSON.stringify(syncedAtMap),
    ]
  );
}

function dedupeCartLinesById(items: CartLine[]): CartLine[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function saveCartItems(
  sessionId: string,
  items: CartLine[]
): Promise<void> {
  const database = await getDatabase();
  const uniqueItems = dedupeCartLinesById(items);

  await database.withTransactionAsync(async () => {
    await database.runAsync(`DELETE FROM cart_items WHERE session_id = ?`, [sessionId]);

    for (const item of uniqueItems) {
      await database.runAsync(`DELETE FROM cart_items WHERE id = ?`, [item.id]);
      await database.runAsync(
        `INSERT INTO cart_items (id, session_id, product_id, barcode, name, brand, image_url, unit_price, quantity, scanned_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          sessionId,
          item.productId,
          item.barcode,
          item.name,
          item.brand ?? null,
          item.imageUrl ?? null,
          item.unitPrice,
          item.quantity,
          item.scannedAt,
        ]
      );
    }
  });
}

type CartItemJoinedRow = {
  id: string;
  product_id: string;
  barcode: string;
  name: string;
  brand: string | null;
  image_url: string | null;
  stored_unit_price: number;
  quantity: number;
  scanned_at: number | null;
  prices_json: string | null;
  prices_synced_at_json: string | null;
  catalog_price: number | null;
  catalog_supermarket_id: string | null;
};

export async function loadCartItems(
  sessionId: string,
  supermarketId: string
): Promise<CartLine[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<CartItemJoinedRow>(
    `SELECT
       ci.id,
       ci.product_id,
       ci.barcode,
       ci.name,
       ci.brand,
       ci.image_url,
       ci.unit_price AS stored_unit_price,
       ci.quantity,
       ci.scanned_at,
       p.prices_json,
       p.prices_synced_at_json,
       p.price AS catalog_price,
       p.supermarket_id AS catalog_supermarket_id
     FROM cart_items ci
     LEFT JOIN products p ON p.barcode = ci.barcode
     WHERE ci.session_id = ?
     ORDER BY ci.scanned_at DESC, ci.id DESC`,
    [sessionId]
  );

  return rows.map((row) => {
    const { prices: pricesMap } = getSanitizedPriceMetaFromRow({
      price: row.catalog_price ?? 0,
      supermarket_id: row.catalog_supermarket_id ?? '',
      prices_json: row.prices_json,
      prices_synced_at_json: row.prices_synced_at_json,
    });

    const unitPrice = readPriceForSupermarket(pricesMap, supermarketId, 0);

    return {
      id: row.id,
      productId: row.product_id,
      barcode: row.barcode,
      name: row.name,
      brand: row.brand ?? undefined,
      imageUrl: row.image_url ?? undefined,
      unitPrice,
      quantity: row.quantity,
      supermarketId,
      scannedAt: row.scanned_at ?? parseScannedAtFromId(row.id),
    };
  });
}

function parseScannedAtFromId(id: string): number {
  const ts = parseInt(id.split('-')[0] ?? '', 10);
  return Number.isFinite(ts) ? ts : 0;
}

export interface PriceReportRecord {
  id: string;
  cartItemId: string;
  productId: string;
  barcode: string;
  supermarketId: string;
  productName: string;
  previousPrice: number;
  reportedPrice: number;
  status: string;
  createdAt: string;
}

export async function listCartSessionsHistory(limit = 30): Promise<CartSessionRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    supermarket_id: string;
    supermarket_name: string;
    started_at: string;
  }>(
    `SELECT id, supermarket_id, supermarket_name, started_at
     FROM cart_sessions
     ORDER BY started_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    supermarketId: row.supermarket_id,
    supermarketName: row.supermarket_name,
    startedAt: row.started_at,
  }));
}

export async function listPriceReports(limit = 50): Promise<PriceReportRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    cart_item_id: string;
    product_id: string;
    barcode: string;
    supermarket_id: string;
    product_name: string;
    previous_price: number;
    reported_price: number;
    status: string;
    created_at: string;
  }>(
    `SELECT * FROM price_reports ORDER BY created_at DESC LIMIT ?`,
    [limit]
  );

  return rows.map((row) => ({
    id: row.id,
    cartItemId: row.cart_item_id,
    productId: row.product_id,
    barcode: row.barcode,
    supermarketId: row.supermarket_id,
    productName: row.product_name,
    previousPrice: row.previous_price,
    reportedPrice: row.reported_price,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function getAppSetting(key: string): Promise<string | null> {
  const database = await getDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = ?`,
    [key]
  );
  return row?.value ?? null;
}

export async function setAppSetting(key: string, value: string): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
}

export async function submitPriceReport(report: PriceReportRecord): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO price_reports (
      id, cart_item_id, product_id, barcode, supermarket_id,
      product_name, previous_price, reported_price, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      report.id,
      report.cartItemId,
      report.productId,
      report.barcode,
      report.supermarketId,
      report.productName,
      report.previousPrice,
      report.reportedPrice,
      report.status,
      report.createdAt,
    ]
  );
}

export type MerchantAnalyticsEventType =
  | 'price_view'
  | 'maps_click'
  | 'best_price_win'
  | 'product_view';

export interface TopViewedProductRecord {
  barcode: string;
  name: string;
  views: number;
}

export interface MerchantDailyStatsRecord {
  uniquePriceVisitors: number;
  mapsClicks: number;
  bestPriceWins: number;
}

function startOfTodayIso(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

function startOfWeekIso(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  now.setDate(now.getDate() - diff);
  now.setHours(0, 0, 0, 0);
  return now.toISOString();
}

export async function recordMerchantAnalyticsEvent(input: {
  supermarketId: string;
  eventType: MerchantAnalyticsEventType;
  visitorId: string;
  productBarcode?: string;
  productName?: string;
}): Promise<void> {
  const database = await getDatabase();
  const id = `ma_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  await database.runAsync(
    `INSERT INTO merchant_analytics_events (
       id, supermarket_id, event_type, visitor_id, product_barcode, product_name, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.supermarketId,
      input.eventType,
      input.visitorId,
      input.productBarcode ?? null,
      input.productName ?? null,
      new Date().toISOString(),
    ]
  );
}

export async function getTopViewedProductsToday(
  supermarketId: string,
  limit = 5
): Promise<TopViewedProductRecord[]> {
  const database = await getDatabase();
  const since = startOfTodayIso();

  const rows = await database.getAllAsync<{
    product_barcode: string;
    product_name: string;
    views: number;
  }>(
    `SELECT
       product_barcode,
       COALESCE(NULLIF(product_name, ''), product_barcode) AS product_name,
       COUNT(*) AS views
     FROM merchant_analytics_events
     WHERE supermarket_id = ?
       AND event_type = 'product_view'
       AND created_at >= ?
       AND product_barcode IS NOT NULL
     GROUP BY product_barcode
     ORDER BY views DESC
     LIMIT ?`,
    [supermarketId, since, limit]
  );

  return rows.map((row) => ({
    barcode: row.product_barcode,
    name: row.product_name,
    views: row.views,
  }));
}

export async function getMerchantAnalyticsToday(
  supermarketId: string
): Promise<MerchantDailyStatsRecord> {
  const database = await getDatabase();
  const since = startOfTodayIso();

  const uniqueVisitors = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(DISTINCT visitor_id) AS count
     FROM merchant_analytics_events
     WHERE supermarket_id = ?
       AND event_type = 'price_view'
       AND created_at >= ?`,
    [supermarketId, since]
  );

  const mapsClicks = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM merchant_analytics_events
     WHERE supermarket_id = ?
       AND event_type = 'maps_click'
       AND created_at >= ?`,
    [supermarketId, since]
  );

  const bestPriceWins = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM merchant_analytics_events
     WHERE supermarket_id = ?
       AND event_type = 'best_price_win'
       AND created_at >= ?`,
    [supermarketId, since]
  );

  return {
    uniquePriceVisitors: uniqueVisitors?.count ?? 0,
    mapsClicks: mapsClicks?.count ?? 0,
    bestPriceWins: bestPriceWins?.count ?? 0,
  };
}

export async function getMerchantAnalyticsWeeklyPeak(
  supermarketId: string
): Promise<MerchantDailyStatsRecord> {
  const database = await getDatabase();
  const since = startOfWeekIso();

  const rows = await database.getAllAsync<{
    day: string;
    event_type: MerchantAnalyticsEventType;
    visitor_id: string | null;
  }>(
    `SELECT substr(created_at, 1, 10) AS day, event_type, visitor_id
     FROM merchant_analytics_events
     WHERE supermarket_id = ?
       AND created_at >= ?`,
    [supermarketId, since]
  );

  const byDay = new Map<
    string,
    { visitors: Set<string>; mapsClicks: number; bestPriceWins: number }
  >();

  for (const row of rows) {
    const bucket = byDay.get(row.day) ?? {
      visitors: new Set<string>(),
      mapsClicks: 0,
      bestPriceWins: 0,
    };

    if (row.event_type === 'price_view' && row.visitor_id) {
      bucket.visitors.add(row.visitor_id);
    }
    if (row.event_type === 'maps_click') bucket.mapsClicks += 1;
    if (row.event_type === 'best_price_win') bucket.bestPriceWins += 1;

    byDay.set(row.day, bucket);
  }

  let peak: MerchantDailyStatsRecord = {
    uniquePriceVisitors: 0,
    mapsClicks: 0,
    bestPriceWins: 0,
  };

  for (const bucket of byDay.values()) {
    peak = {
      uniquePriceVisitors: Math.max(peak.uniquePriceVisitors, bucket.visitors.size),
      mapsClicks: Math.max(peak.mapsClicks, bucket.mapsClicks),
      bestPriceWins: Math.max(peak.bestPriceWins, bucket.bestPriceWins),
    };
  }

  return peak;
}

export interface CompletedPurchaseItem {
  id: string;
  barcode: string;
  name: string;
  brand?: string;
  quantity: number;
  unitPrice: number;
}

export interface CompletedPurchaseRecord {
  id: string;
  supermarketId: string;
  supermarketName: string;
  completedAt: string;
  total: number;
  itemCount: number;
  listSavings: number;
  items: CompletedPurchaseItem[];
}

function mapCompletedPurchaseRow(row: {
  id: string;
  supermarket_id: string;
  supermarket_name: string;
  completed_at: string;
  total: number;
  item_count: number;
  list_savings: number;
  items_json: string;
}): CompletedPurchaseRecord {
  let items: CompletedPurchaseItem[] = [];
  try {
    const parsed = JSON.parse(row.items_json) as CompletedPurchaseItem[];
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = [];
  }

  return {
    id: row.id,
    supermarketId: row.supermarket_id,
    supermarketName: row.supermarket_name,
    completedAt: row.completed_at,
    total: row.total,
    itemCount: row.item_count,
    listSavings: row.list_savings,
    items,
  };
}

export async function saveCompletedPurchase(
  purchase: CompletedPurchaseRecord
): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(
    `INSERT INTO completed_purchases (
      id, supermarket_id, supermarket_name, completed_at,
      total, item_count, list_savings, items_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      purchase.id,
      purchase.supermarketId,
      purchase.supermarketName,
      purchase.completedAt,
      purchase.total,
      purchase.itemCount,
      purchase.listSavings,
      JSON.stringify(purchase.items),
    ]
  );
}

export async function listCompletedPurchases(
  limit = 100
): Promise<CompletedPurchaseRecord[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    supermarket_id: string;
    supermarket_name: string;
    completed_at: string;
    total: number;
    item_count: number;
    list_savings: number;
    items_json: string;
  }>(
    `SELECT id, supermarket_id, supermarket_name, completed_at,
            total, item_count, list_savings, items_json
     FROM completed_purchases
     ORDER BY completed_at DESC
     LIMIT ?`,
    [limit]
  );

  return rows.map(mapCompletedPurchaseRow);
}

export async function getCompletedPurchase(
  id: string
): Promise<CompletedPurchaseRecord | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    supermarket_id: string;
    supermarket_name: string;
    completed_at: string;
    total: number;
    item_count: number;
    list_savings: number;
    items_json: string;
  }>(
    `SELECT id, supermarket_id, supermarket_name, completed_at,
            total, item_count, list_savings, items_json
     FROM completed_purchases
     WHERE id = ?`,
    [id]
  );

  return row ? mapCompletedPurchaseRow(row) : null;
}

export async function deleteCompletedPurchase(id: string): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM completed_purchases WHERE id = ?`, [id]);
}

export async function clearCompletedPurchases(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM completed_purchases`);
}

import { getAppSetting, setAppSetting, upsertProduct, saveCartSession } from '@/db/database';
import { MOCK_PRODUCTS } from '@/data/mockProducts';

const MOCK_CATALOG_SEED_KEY = 'mock_catalog_seeded_v1';

export async function seedMockCatalog(): Promise<void> {
  const alreadySeeded = await getAppSetting(MOCK_CATALOG_SEED_KEY);
  if (alreadySeeded === '1') return;

  for (const product of MOCK_PRODUCTS) {
    await upsertProduct(product);
  }

  await setAppSetting(MOCK_CATALOG_SEED_KEY, '1');
}

/** Prepara SQLite al elegir supermercado: catálogo (1 vez) + sesión activa */
export async function prepareSupermarketSession(
  supermarketId: string,
  supermarketName: string
): Promise<void> {
  const marketSeedKey = `mock_market_seeded_${supermarketId}_v1`;
  const alreadySeeded = await getAppSetting(marketSeedKey);

  if (alreadySeeded !== '1') {
    const marketProducts = MOCK_PRODUCTS.filter((p) => p.supermarketId === supermarketId);
    for (const product of marketProducts) {
      await upsertProduct(product);
    }
    await setAppSetting(marketSeedKey, '1');
  }

  await saveCartSession({
    id: `session-${supermarketId}`,
    supermarketId,
    supermarketName,
    startedAt: new Date().toISOString(),
  });
}

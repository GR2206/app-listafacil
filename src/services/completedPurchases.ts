import {
  saveCompletedPurchase,
  type CompletedPurchaseItem,
  type CompletedPurchaseRecord,
} from '@/db/database';
import type { UserPriceRecord } from '@/db/userPrices';
import type { CartLine } from '@/types';
import {
  resolveCartLinesForSupermarket,
  sumCartTotal,
} from '@/utils/resolveCartLines';

function generatePurchaseId(): string {
  return `purchase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildPurchaseSnapshot(
  supermarketId: string,
  supermarketName: string,
  items: CartLine[],
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>>,
  userPricesByBarcode: Record<string, UserPriceRecord>,
  listSavings = 0
): Omit<CompletedPurchaseRecord, 'id' | 'completedAt'> {
  const resolved = resolveCartLinesForSupermarket(
    items,
    pricesByBarcode,
    supermarketId,
    { syncedAtByBarcode, userPricesByBarcode }
  );

  const purchaseItems: CompletedPurchaseItem[] = resolved.map((line) => ({
    id: line.id,
    barcode: line.barcode,
    name: line.name,
    brand: line.brand,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }));

  return {
    supermarketId,
    supermarketName,
    total: sumCartTotal(resolved),
    itemCount: resolved.reduce((sum, line) => sum + line.quantity, 0),
    listSavings: Math.max(0, Math.round(listSavings)),
    items: purchaseItems,
  };
}

export async function finalizeCartPurchase(
  supermarketId: string,
  supermarketName: string,
  items: CartLine[],
  pricesByBarcode: Record<string, Record<string, number>>,
  syncedAtByBarcode: Record<string, Record<string, string>>,
  userPricesByBarcode: Record<string, UserPriceRecord>,
  listSavings = 0
): Promise<CompletedPurchaseRecord> {
  const snapshot = buildPurchaseSnapshot(
    supermarketId,
    supermarketName,
    items,
    pricesByBarcode,
    syncedAtByBarcode,
    userPricesByBarcode,
    listSavings
  );

  const record: CompletedPurchaseRecord = {
    ...snapshot,
    id: generatePurchaseId(),
    completedAt: new Date().toISOString(),
  };

  await saveCompletedPurchase(record);
  return record;
}

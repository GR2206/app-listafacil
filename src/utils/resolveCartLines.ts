import type { UserPriceRecord } from '@/db/userPrices';
import type { TicketSubstituteMap } from '@/services/similarProductSubstitute';
import { substituteKey } from '@/services/similarProductSubstitute';
import type { CartLine } from '@/types';
import { isManualCartLine } from '@/utils/manualProduct';
import { resolveEffectiveUnitPriceForItem } from '@/utils/resolvePrice';
import { logPriceAudit } from '@/utils/priceAuditLog';
import { readPriceForSupermarket } from '@/utils/supermarketPrices';

export interface ResolvedCartLine extends CartLine {
  /** Precio tomado de un producto similar / mismo producto (otro EAN). */
  isSubstitute?: boolean;
  substituteName?: string;
  substituteBarcode?: string;
  substituteKind?: 'same_product' | 'similar';
}

export interface ResolveCartLinesOptions {
  syncedAtByBarcode?: Record<string, Record<string, string>>;
  userPricesByBarcode?: Record<string, UserPriceRecord>;
  substitutesByKey?: TicketSubstituteMap;
}

export function resolveCartLinesForSupermarket(
  items: CartLine[],
  pricesByBarcode: Record<string, Record<string, number>>,
  supermarketId: string,
  options: ResolveCartLinesOptions = {}
): ResolvedCartLine[] {
  const syncedAtByBarcode = options.syncedAtByBarcode ?? {};
  const userPricesByBarcode = options.userPricesByBarcode ?? {};
  const substitutesByKey = options.substitutesByKey ?? {};

  return items.map((item) => {
    if (isManualCartLine(item)) {
      return {
        ...item,
        unitPrice: item.unitPrice,
        supermarketId,
      };
    }

    const precios = pricesByBarcode[item.barcode] ?? {};
    const fromCatalog = readPriceForSupermarket(precios, supermarketId, 0);

    logPriceAudit('CartResolve', {
      barcode: item.barcode,
      supermarketId,
      catalogPrice: fromCatalog > 0 ? fromCatalog : null,
      availableKeys: Object.keys(precios),
    });

    let unitPrice = resolveEffectiveUnitPriceForItem({
      barcode: item.barcode,
      supermarketId,
      pricesByBarcode,
      syncedAtByBarcode,
      userPricesByBarcode,
      catalogPrice: fromCatalog,
      cartStoredPrice: item.supermarketId === supermarketId ? item.unitPrice : 0,
    });

    if (unitPrice > 0) {
      return {
        ...item,
        unitPrice,
        supermarketId,
      };
    }

    const substitute = substitutesByKey[substituteKey(item.barcode, supermarketId)];
    if (substitute && substitute.unitPrice > 0) {
      return {
        ...item,
        unitPrice: substitute.unitPrice,
        supermarketId,
        isSubstitute: true,
        substituteName: substitute.substituteName,
        substituteBarcode: substitute.substituteBarcode,
        substituteKind: substitute.kind ?? 'similar',
      };
    }

    return {
      ...item,
      unitPrice: 0,
      supermarketId,
    };
  });
}

export function sumCartTotal(items: CartLine[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function countUnpricedLines(items: CartLine[]): number {
  return items.filter((item) => item.unitPrice <= 0).length;
}

export function countSubstitutedLines(items: ResolvedCartLine[]): number {
  return items.filter((item) => item.isSubstitute && item.unitPrice > 0).length;
}

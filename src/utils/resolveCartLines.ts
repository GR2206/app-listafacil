import type { UserPriceRecord } from '@/db/userPrices';

import type { CartLine } from '@/types';



import { isManualCartLine } from '@/utils/manualProduct';

import { resolveEffectiveUnitPriceForItem } from '@/utils/resolvePrice';

import { logPriceAudit } from '@/utils/priceAuditLog';
import { readPriceForSupermarket } from '@/utils/supermarketPrices';



export interface ResolveCartLinesOptions {

  syncedAtByBarcode?: Record<string, Record<string, string>>;

  userPricesByBarcode?: Record<string, UserPriceRecord>;

}



export function resolveCartLinesForSupermarket(

  items: CartLine[],

  pricesByBarcode: Record<string, Record<string, number>>,

  supermarketId: string,

  options: ResolveCartLinesOptions = {}

): CartLine[] {

  const syncedAtByBarcode = options.syncedAtByBarcode ?? {};

  const userPricesByBarcode = options.userPricesByBarcode ?? {};



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

    const unitPrice = resolveEffectiveUnitPriceForItem({

      barcode: item.barcode,

      supermarketId,

      pricesByBarcode,

      syncedAtByBarcode,

      userPricesByBarcode,

      catalogPrice: fromCatalog,

      cartStoredPrice: item.supermarketId === supermarketId ? item.unitPrice : 0,

    });



    return {

      ...item,

      unitPrice,

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



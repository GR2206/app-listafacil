import type { UserPriceRecord } from '@/db/userPrices';

import { readSyncTimeForSupermarket } from '@/utils/supermarketPrices';



export function isPriceAvailable(price: number | null | undefined): boolean {

  return price != null && Number.isFinite(price) && price > 0;

}



function isCatalogPriceNewer(

  catalogSyncedAt: string | null | undefined,

  userRecord: UserPriceRecord | undefined

): boolean {

  if (!catalogSyncedAt || !userRecord?.scrapeSnapshotAt) return Boolean(catalogSyncedAt);



  return catalogSyncedAt > userRecord.scrapeSnapshotAt;

}



/**

 * Prioridad:

 * 1) Precio del scrape si es más nuevo que el override del usuario

 * 2) Precio guardado por el usuario (precios_usuario)

 * 3) Precio del catálogo/scrape actual

 * 4) Precio almacenado en la línea del carrito

 */

export function resolveEffectiveUnitPrice(input: {

  catalogPrice: number;

  catalogSyncedAt?: string | null;

  userPrice?: UserPriceRecord;

  cartStoredPrice?: number;

}): number {

  const catalogPrice = isPriceAvailable(input.catalogPrice) ? input.catalogPrice : 0;

  const userPrice = isPriceAvailable(input.userPrice?.unitPrice)

    ? input.userPrice!.unitPrice

    : 0;

  const cartStoredPrice = isPriceAvailable(input.cartStoredPrice) ? input.cartStoredPrice! : 0;



  if (

    catalogPrice > 0 &&

    input.userPrice &&

    isCatalogPriceNewer(input.catalogSyncedAt, input.userPrice)

  ) {

    return catalogPrice;

  }



  if (userPrice > 0) return userPrice;

  if (catalogPrice > 0) return catalogPrice;

  return cartStoredPrice;

}



export function resolveEffectiveUnitPriceForItem(input: {

  barcode: string;

  supermarketId: string;

  pricesByBarcode: Record<string, Record<string, number>>;

  syncedAtByBarcode: Record<string, Record<string, string>>;

  userPricesByBarcode: Record<string, UserPriceRecord>;

  catalogPrice: number;

  cartStoredPrice?: number;

}): number {

  const syncedAt = readSyncTimeForSupermarket(

    input.syncedAtByBarcode[input.barcode] ?? {},

    input.supermarketId

  );



  const userRecord = input.userPricesByBarcode[input.barcode];
  const userPrice =
    userRecord?.supermarketId === input.supermarketId ? userRecord : undefined;

  return resolveEffectiveUnitPrice({

    catalogPrice: input.catalogPrice,

    catalogSyncedAt: syncedAt,

    userPrice,

    cartStoredPrice: input.cartStoredPrice,

  });

}



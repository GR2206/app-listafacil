import { findProductByBarcode, upsertProduct } from '@/db/database';

import { getEanProductMapping, saveEanProductMapping } from '@/services/eanProductMapping';
import { logEanPrefixStripEvent } from '@/services/eanPrefixEventLog';
import {
  fetchProductByDocId,
  fetchProductWithEanCleanup,
  searchProductsByNameInFirestore,
} from '@/services/firebaseProducts';
import { normalizarEAN } from '@/utils/eanLookup';
import { logPriceAudit } from '@/utils/priceAuditLog';

import type { Product } from '@/types';

export interface ProductLookupOptions {
  nameHint?: string;
}

export interface ProductLookupResult {
  product: Product | null;
  normalizedBarcode: string | null;
  matchedBarcode: string | null;
  eanRoundsTried: number;
  nameSearchUsed: boolean;
}

async function mergeRemoteWithLocal(
  remote: Product,
  normalizedBarcode: string,
  supermarketId: string
): Promise<Product> {
  const local = await findProductByBarcode(normalizedBarcode, supermarketId);

  const resolved: Product = {
    ...remote,
    barcode: remote.barcode || normalizedBarcode,
    supermarketId,
    price: remote.price > 0 ? remote.price : 0,
    imageUrl: remote.imageUrl ?? local?.imageUrl,
    priceSyncedAt: remote.priceSyncedAt ?? local?.updatedAt,
  };

  logPriceAudit('MergeRemoteLocal', {
    barcode: normalizedBarcode,
    supermarketId,
    remotePrice: remote.price > 0 ? remote.price : null,
    resolvedPrice: resolved.price > 0 ? resolved.price : null,
    note:
      remote.price <= 0
        ? 'Firestore sin precio para este super — no se reutiliza caché local'
        : undefined,
  });

  const hasCatalogPrices = Boolean(
    resolved.catalogPrices && Object.values(resolved.catalogPrices.prices).some((price) => price > 0)
  );

  if (resolved.price > 0 || resolved.imageUrl || hasCatalogPrices) {
    await upsertProduct(resolved);
  }

  return resolved;
}

export async function lookupProductDetailed(
  barcode: string,
  supermarketId: string,
  options: ProductLookupOptions = {}
): Promise<ProductLookupResult> {
  const norm = normalizarEAN(barcode);
  if (!norm) {
    return {
      product: null,
      normalizedBarcode: null,
      matchedBarcode: null,
      eanRoundsTried: 0,
      nameSearchUsed: false,
    };
  }

  const scannedEan = norm.scanned;

  const mapping = await getEanProductMapping(scannedEan, supermarketId);
  if (mapping?.id_producto) {
    const mapped = await fetchProductByDocId(mapping.id_producto, supermarketId);
    if (mapped?.name) {
      const resolved = await mergeRemoteWithLocal(
        {
          ...mapped,
          barcode: scannedEan,
          id: scannedEan,
        },
        scannedEan,
        supermarketId
      );

      return {
        product: resolved,
        normalizedBarcode: scannedEan,
        matchedBarcode: mapping.id_producto,
        eanRoundsTried: 0,
        nameSearchUsed: false,
      };
    }
  }

  const { product: remote, attempt } = await fetchProductWithEanCleanup(
    barcode,
    supermarketId,
  );

  if (remote?.name) {
    const storeBarcode = attempt.scannedEan ?? scannedEan;

    if (
      attempt.prefixStripped &&
      attempt.scannedEan &&
      attempt.matchedBarcode &&
      attempt.scannedEan !== attempt.matchedBarcode
    ) {
      void saveEanProductMapping({
        ean: attempt.scannedEan,
        supermercado: supermarketId,
        id_producto: attempt.matchedBarcode,
        productName: remote.name,
        source: 'prefix_strip',
      });

      void logEanPrefixStripEvent({
        scannedEan: attempt.scannedEan,
        matchedEan: attempt.matchedBarcode,
        supermarketId,
        prefixChar: attempt.prefixChar,
      });
    }

    const resolved = await mergeRemoteWithLocal(
      {
        ...remote,
        barcode: storeBarcode,
        id: storeBarcode,
      },
      storeBarcode,
      supermarketId
    );

    return {
      product: resolved,
      normalizedBarcode: storeBarcode,
      matchedBarcode: attempt.matchedBarcode,
      eanRoundsTried: attempt.rounds.length,
      nameSearchUsed: false,
    };
  }

  const local = await findProductByBarcode(scannedEan, supermarketId);
  if (local) {
    return {
      product: local,
      normalizedBarcode: scannedEan,
      matchedBarcode: scannedEan,
      eanRoundsTried: attempt.rounds.length,
      nameSearchUsed: false,
    };
  }

  const nameHint = options.nameHint?.trim();
  if (nameHint && nameHint.length >= 3) {
    const byName = await searchProductsByNameInFirestore(nameHint, supermarketId);
    if (byName?.name) {
      const resolved = await mergeRemoteWithLocal(byName, byName.barcode, supermarketId);
      return {
        product: resolved,
        normalizedBarcode: scannedEan,
        matchedBarcode: byName.barcode,
        eanRoundsTried: attempt.rounds.length,
        nameSearchUsed: true,
      };
    }
  }

  return {
    product: null,
    normalizedBarcode: scannedEan,
    matchedBarcode: null,
    eanRoundsTried: attempt.rounds.length,
    nameSearchUsed: Boolean(nameHint && nameHint.length >= 3),
  };
}

export async function lookupProduct(
  barcode: string,
  supermarketId: string,
  options?: ProductLookupOptions
): Promise<Product | null> {
  const result = await lookupProductDetailed(barcode, supermarketId, options);
  return result.product;
}

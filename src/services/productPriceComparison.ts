import type { OfertaDiaItem } from '@/types/ofertaDia';
import type { Product, Supermarket } from '@/types';
import { normalizeSearchText, scoreProductNameMatch } from '@/utils/productSearchQuery';
import {
  dropCrossMarketPriceOutliers,
  readPriceForSupermarket,
  readSyncTimeForSupermarket,
} from '@/utils/supermarketPrices';

export interface ProductSupermarketPriceRow {
  supermarketId: string;
  supermarketName: string;
  unitPrice: number;
  syncedAt: string | null;
  isCheapest: boolean;
  /** Ahorro % vs el más caro de la zona (si hay al menos 2 precios). */
  discountPctVsMax: number | null;
  /** Hay oferta del día para este barcode + super. */
  hasOfertaDia: boolean;
  ofertaLabel: string | null;
}

function ofertaMatchesProduct(item: OfertaDiaItem, product: Product): boolean {
  const barcode = product.barcode.trim();
  const itemCode = item.barcode.trim();
  if (itemCode && barcode && itemCode === barcode) return true;
  if (barcode.startsWith('oferta-') && barcode === `oferta-${item.id}`) return true;

  const title = normalizeSearchText(item.titulo);
  const name = normalizeSearchText(product.name);
  if (!title || !name) return false;
  if (title === name || name.includes(title) || title.includes(name)) return true;
  return scoreProductNameMatch(product.name, item.titulo) >= 70;
}

export function buildProductSupermarketPriceRows(options: {
  product: Product;
  markets: Supermarket[];
  ofertaDiaItems?: OfertaDiaItem[];
}): ProductSupermarketPriceRow[] {
  const { product, markets, ofertaDiaItems = [] } = options;
  const prices = dropCrossMarketPriceOutliers(product.catalogPrices?.prices ?? {});
  const syncedAt = product.catalogPrices?.syncedAt ?? {};

  const ofertaBySuper = new Map<string, OfertaDiaItem>();
  for (const item of ofertaDiaItems) {
    if (!ofertaMatchesProduct(item, product)) continue;
    const id = item.supermarketId?.trim();
    if (!id) continue;
    if (!ofertaBySuper.has(id)) ofertaBySuper.set(id, item);
  }

  const priced = markets
    .map((market) => {
      const catalogPrice = readPriceForSupermarket(prices, market.id, 0);
      const oferta = ofertaBySuper.get(market.id);
      const ofertaPrice = oferta
        ? Number(String(oferta.precio).replace(/[^\d.]/g, ''))
        : 0;
      const unitPrice =
        catalogPrice > 0
          ? catalogPrice
          : Number.isFinite(ofertaPrice) && ofertaPrice > 0
            ? Math.round(ofertaPrice)
            : market.id === product.supermarketId && product.price > 0
              ? product.price
              : 0;

      return {
        supermarketId: market.id,
        supermarketName: market.name,
        unitPrice,
        syncedAt: readSyncTimeForSupermarket(syncedAt, market.id),
        hasOfertaDia: Boolean(oferta),
        ofertaLabel: oferta?.gancho?.trim() || oferta?.urgencia?.trim() || null,
      };
    })
    .filter((row) => row.unitPrice > 0);

  if (priced.length === 0) return [];

  const maxPrice = Math.max(...priced.map((row) => row.unitPrice));
  const minPrice = Math.min(...priced.map((row) => row.unitPrice));

  return priced
    .map((row) => {
      const discountPctVsMax =
        priced.length >= 2 && maxPrice > row.unitPrice
          ? Math.round(((maxPrice - row.unitPrice) / maxPrice) * 100)
          : null;

      return {
        ...row,
        isCheapest: row.unitPrice === minPrice,
        discountPctVsMax,
      };
    })
    .sort((a, b) => a.unitPrice - b.unitPrice);
}

/** Filtra filas con promo explícita o descuento relevante vs el más caro. */
export function filterPromoOrDiscountRows(
  rows: ProductSupermarketPriceRow[],
  minDiscountPct = 5
): ProductSupermarketPriceRow[] {
  return rows.filter(
    (row) =>
      row.hasOfertaDia ||
      (row.discountPctVsMax != null && row.discountPctVsMax >= minDiscountPct)
  );
}

export function productToCartPayload(
  product: Product,
  supermarketId: string,
  unitPrice: number
): Product {
  return {
    ...product,
    id: product.barcode,
    supermarketId,
    price: unitPrice,
  };
}

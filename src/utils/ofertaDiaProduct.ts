import type { OfertaDiaItem } from '@/types/ofertaDia';
import type { Product } from '@/types';
import {
  normalizeSearchText,
  productMatchesSearchQuery,
} from '@/utils/productSearchQuery';

/** Convierte una oferta del carrusel a Product para la lista de búsqueda / carrito. */
export function ofertaDiaToProduct(item: OfertaDiaItem): Product {
  const price = Number(String(item.precio).replace(/[^\d.]/g, ''));
  const unitPrice = Number.isFinite(price) && price > 0 ? Math.round(price) : 0;
  const supermarketId = item.supermarketId?.trim() || 'jumbo';
  const barcode = item.barcode?.trim() || `oferta-${item.id}`;

  return {
    id: barcode,
    barcode,
    name: item.titulo.trim(),
    imageUrl: item.imagen?.trim() || undefined,
    price: unitPrice,
    supermarketId,
    catalogPrices:
      unitPrice > 0
        ? {
            prices: { [supermarketId]: unitPrice },
            syncedAt: {},
          }
        : undefined,
  };
}

/**
 * Oferta alineada al texto de búsqueda (misma regla estricta que el buscador).
 * Sin query → no matchea (no listar todas las ofertas).
 */
export function ofertaMatchesQuery(item: OfertaDiaItem, query: string): boolean {
  return productMatchesSearchQuery(item.titulo, null, query);
}

/** Barcodes de oferta_día para badges O(1) en listas. */
export function buildOfertaBarcodeSet(ofertas: OfertaDiaItem[]): Set<string> {
  const set = new Set<string>();
  for (const item of ofertas) {
    const barcode = item.barcode?.trim();
    if (barcode) set.add(barcode);
  }
  return set;
}

/**
 * Filtra ofertas por query. `limit` opcional; sin él devuelve todas las coincidencias.
 */
export function takeOfertasMatchingQuery(
  ofertas: OfertaDiaItem[],
  query: string,
  limit?: number
): Product[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const out: Product[] = [];
  const seen = new Set<string>();
  for (const item of ofertas) {
    if (!ofertaMatchesQuery(item, q)) continue;
    const product = ofertaDiaToProduct(item);
    if (seen.has(product.barcode)) continue;
    seen.add(product.barcode);
    out.push(product);
    if (limit != null && limit > 0 && out.length >= limit) break;
  }
  return out;
}

/** ¿Este producto de catálogo corresponde a alguna oferta del día? */
export function productMatchesOfertaDia(
  product: Product,
  ofertas: OfertaDiaItem[]
): boolean {
  const barcode = product.barcode.trim();
  if (barcode && !barcode.startsWith('oferta-')) {
    if (ofertas.some((o) => o.barcode.trim() && o.barcode.trim() === barcode)) {
      return true;
    }
  }

  const name = normalizeSearchText(product.name);
  return ofertas.some((oferta) => {
    const title = normalizeSearchText(oferta.titulo);
    if (!title) return false;
    if (name.includes(title) || title.includes(name)) return true;
    return scoreProductNameMatch(product.name, oferta.titulo) >= 70;
  });
}

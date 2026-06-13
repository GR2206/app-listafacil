import { searchProductCandidatesByName } from '@/services/firebaseProducts';

import type { Product } from '@/types';

/**
 * Búsqueda por nombre en el catálogo del supermercado (Productos en Firestore,
 * alimentado por el scraper web de cada cadena).
 */
export async function searchProductsOnSupermarketWeb(
  queryText: string,
  supermarketId: string,
  limit = 8
): Promise<Product[]> {
  const term = queryText.trim();
  if (term.length < 2) return [];

  return searchProductCandidatesByName(term, supermarketId, limit);
}

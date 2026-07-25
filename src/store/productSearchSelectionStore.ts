import type { Product } from '@/types';

/** Puente liviano entre buscar → comparar (evita meter JSON enorme en la URL). */
let selectedProduct: Product | null = null;

export function setProductSearchSelection(product: Product | null): void {
  selectedProduct = product;
}

export function getProductSearchSelection(): Product | null {
  return selectedProduct;
}

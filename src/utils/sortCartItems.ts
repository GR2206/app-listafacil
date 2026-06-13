import type { CartLine } from '@/types';

export type SortMode = 'chrono' | 'alpha' | 'price-desc' | 'price-asc';

export function sortCartItems(items: CartLine[], mode: SortMode): CartLine[] {
  const copy = [...items];

  switch (mode) {
    case 'alpha':
      return copy.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    case 'price-desc':
      return copy.sort(
        (a, b) => b.unitPrice * b.quantity - a.unitPrice * a.quantity
      );
    case 'price-asc':
      return copy.sort(
        (a, b) => a.unitPrice * a.quantity - b.unitPrice * b.quantity
      );
    case 'chrono':
    default:
      return copy.sort((a, b) => (b.scannedAt ?? 0) - (a.scannedAt ?? 0));
  }
}

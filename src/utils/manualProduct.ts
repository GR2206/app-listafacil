import type { CartLine } from '@/types';

export const MANUAL_BARCODE_PREFIX = 'manual-';

export function isManualCartLine(item: Pick<CartLine, 'isManual' | 'barcode'>): boolean {
  return Boolean(item.isManual) || item.barcode.startsWith(MANUAL_BARCODE_PREFIX);
}

export function createManualBarcode(): string {
  return `${MANUAL_BARCODE_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

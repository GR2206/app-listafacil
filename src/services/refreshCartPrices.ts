import { lookupProduct } from '@/services/productLookup';

export async function refreshCartPricesFromFirestore(
  barcodes: string[],
  supermarketId: string
): Promise<void> {
  const uniqueBarcodes = [...new Set(barcodes)];
  if (uniqueBarcodes.length === 0) return;

  await Promise.all(
    uniqueBarcodes.map(async (barcode) => {
      try {
        await lookupProduct(barcode, supermarketId);
      } catch {
        // Un producto fallido no bloquea el resto.
      }
    })
  );
}

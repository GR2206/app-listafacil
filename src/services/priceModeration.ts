import { submitPriceReport as persistReport } from '@/db/database';

export interface PriceReportPayload {
  cartItemId: string;
  productId: string;
  barcode: string;
  supermarketId: string;
  productName: string;
  previousPrice: number;
  reportedPrice: number;
}

/**
 * Envía un reporte de precio corregido por el usuario a la cola de moderación.
 * En producción: POST /api/v1/moderation/price-reports
 */
export async function submitPriceReport(payload: PriceReportPayload): Promise<void> {
  if (payload.reportedPrice === payload.previousPrice) return;

  await persistReport({
    id: `pr-${Date.now()}`,
    cartItemId: payload.cartItemId,
    productId: payload.productId,
    barcode: payload.barcode,
    supermarketId: payload.supermarketId,
    productName: payload.productName,
    previousPrice: payload.previousPrice,
    reportedPrice: payload.reportedPrice,
    status: 'pending',
    createdAt: new Date().toISOString(),
  });
}

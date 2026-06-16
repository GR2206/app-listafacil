import { submitPriceReport as persistReport } from '@/db/database';
import { submitCrowdPriceVote } from '@/services/crowdPriceConsensus';

export interface PriceReportPayload {
  cartItemId: string;
  productId: string;
  barcode: string;
  supermarketId: string;
  productName: string;
  previousPrice: number;
  reportedPrice: number;
}

export interface PriceReportResult {
  crowdVoteCounted: boolean;
  consensusCount: number;
  publishedToCatalog: boolean;
}

/**
 * Guarda el reporte localmente y suma al consenso global en Firestore.
 * Con 5+ usuarios el mismo día y mismo precio, actualiza Productos automáticamente.
 */
export async function submitPriceReport(payload: PriceReportPayload): Promise<PriceReportResult> {
  if (payload.reportedPrice === payload.previousPrice) {
    return { crowdVoteCounted: false, consensusCount: 0, publishedToCatalog: false };
  }

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

  try {
    const crowd = await submitCrowdPriceVote({
      barcode: payload.barcode,
      supermarketId: payload.supermarketId,
      productName: payload.productName,
      reportedPrice: payload.reportedPrice,
      previousPrice: payload.previousPrice,
    });
    return {
      crowdVoteCounted: crowd.counted,
      consensusCount: crowd.consensusCount,
      publishedToCatalog: crowd.publishedToCatalog,
    };
  } catch (error) {
    console.warn('[CrowdPrice] No se pudo registrar voto en Firestore:', error);
    return { crowdVoteCounted: false, consensusCount: 0, publishedToCatalog: false };
  }
}

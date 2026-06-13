import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';

const PENDING_COLLECTION = 'Pendientes_de_carga';

export interface PendingProductPayload {
  barcode: string;
  supermarketId: string;
  supermarketName?: string;
  rawScan?: string;
  nameHint?: string;
  source?: 'scan' | 'manual';
  /** Prioridad alta para la próxima corrida del bot de scraping. */
  priority?: boolean;
}

export async function reportPendingProduct(
  payload: PendingProductPayload
): Promise<boolean> {
  const barcode = payload.barcode.replace(/\D/g, '');
  if (!barcode) return false;

  try {
    await setDoc(
      doc(db, PENDING_COLLECTION, barcode),
      {
        ean: barcode,
        barcode,
        supermarketId: payload.supermarketId,
        supermarketName: payload.supermarketName ?? null,
        rawScan: payload.rawScan ?? null,
        nameHint: payload.nameHint?.trim() || null,
        source: payload.source ?? 'scan',
        status: 'pending',
        priority: payload.priority ? 1 : 0,
        scrapePriority: payload.priority ?? false,
        reportedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo reportar producto pendiente:', error);
    return false;
  }
}

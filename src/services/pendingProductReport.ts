import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';

const PENDING_COLLECTION = 'Pendientes_de_carga';

export interface PendingProductPayload {
  barcode: string;
  supermarketId: string;
  supermarketName?: string;
  rawScan?: string;
  nameHint?: string;
  source?: 'scan' | 'manual' | 'user_proposal';
  /** Prioridad alta para la próxima corrida del bot de scraping. */
  priority?: boolean;
}

export interface UserProductProposalPayload {
  barcode: string;
  supermarketId: string;
  supermarketName?: string;
  rawScan?: string;
  nameHint?: string;
  productName: string;
  brand?: string;
  price: number;
  imageUrl?: string;
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

/** Propuesta completa del usuario cuando el producto no existe en la web del super. */
export async function reportUserProductProposal(
  payload: UserProductProposalPayload
): Promise<boolean> {
  const barcode = payload.barcode.replace(/\D/g, '');
  const productName = payload.productName.trim();
  const price = Math.round(payload.price);

  if (!barcode || !productName || price <= 0) return false;

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
        productName,
        brand: payload.brand?.trim() || null,
        price,
        imageUrl: payload.imageUrl?.trim() || null,
        proposalType: 'new_product',
        source: 'user_proposal',
        status: 'pending',
        priority: 0,
        scrapePriority: false,
        reportedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo enviar propuesta de producto:', error);
    return false;
  }
}

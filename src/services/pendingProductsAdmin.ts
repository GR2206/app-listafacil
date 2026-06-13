import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  limit,
} from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';
import { getEanProductMapping, saveEanProductMapping } from '@/services/eanProductMapping';

const PENDING_COLLECTION = 'Pendientes_de_carga';

export interface PendingReviewItem {
  id: string;
  ean: string;
  supermarketId: string;
  supermarketName?: string;
  nameHint?: string;
  rawScan?: string;
  id_producto?: string;
  productName?: string;
  status: 'pending' | 'confirmed' | string;
  source?: string;
}

export function getPendingReviewDisplayName(item: PendingReviewItem): string {
  return item.productName?.trim() || item.nameHint?.trim() || 'Producto sin identificar';
}

/** Explica en lenguaje claro qué está proponiendo el usuario. */
export function describePendingUserProposal(item: PendingReviewItem): string[] {
  const lines: string[] = [];

  if (item.source === 'scan') {
    lines.push(
      'Escaneó un código de barras que no estaba en la base de ListaFacil y pidió incorporarlo.'
    );
  } else if (item.source === 'manual') {
    lines.push('Reportó manualmente este producto para que se revise e incorpore al catálogo.');
  } else {
    lines.push('Envió este producto desde la app para revisión e incorporación al catálogo.');
  }

  if (item.nameHint) {
    lines.push(`Nombre detectado en el escaneo: «${item.nameHint}».`);
  }

  if (item.id_producto && item.productName) {
    lines.push(
      `Vinculó el código con «${item.productName}» usando el ID interno del supermercado (${item.id_producto}).`
    );
  } else if (item.id_producto) {
    lines.push(
      `Vinculó el código con el ID interno del supermercado: ${item.id_producto}. Falta confirmar el nombre en catálogo.`
    );
  } else {
    lines.push(
      'Aún no vinculó un producto del catálogo: el bot lo buscará con prioridad o debe vincularse manualmente desde la app.'
    );
  }

  return lines;
}

function mapPendingDoc(id: string, data: Record<string, unknown>): PendingReviewItem {
  const ean =
    (typeof data.ean === 'string' && data.ean) ||
    (typeof data.barcode === 'string' && data.barcode) ||
    id;

  const supermarketId =
    (typeof data.supermarketId === 'string' && data.supermarketId) ||
    (typeof data.supermercado === 'string' && data.supermercado) ||
    '';

  const id_producto =
    typeof data.id_producto === 'string'
      ? data.id_producto
      : typeof data.productoId === 'string'
        ? data.productoId
        : undefined;

  return {
    id,
    ean: ean.replace(/\D/g, '') || id,
    supermarketId,
    supermarketName:
      typeof data.supermarketName === 'string' ? data.supermarketName : undefined,
    nameHint: typeof data.nameHint === 'string' ? data.nameHint : undefined,
    rawScan: typeof data.rawScan === 'string' ? data.rawScan : undefined,
    id_producto,
    productName: typeof data.productName === 'string' ? data.productName : undefined,
    status: typeof data.status === 'string' ? data.status : 'pending',
    source: typeof data.source === 'string' ? data.source : undefined,
  };
}

async function fetchByStatus(status: 'pending' | 'confirmed'): Promise<PendingReviewItem[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, PENDING_COLLECTION),
        where('status', '==', status),
        limit(80)
      )
    );

    return snapshot.docs
      .map((docSnap) => mapPendingDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
      .sort((a, b) => a.ean.localeCompare(b.ean));
  } catch (error) {
    console.warn(`[Firestore] No se pudo listar ${status}:`, error);
    return [];
  }
}

export async function listPendingReviewProducts(): Promise<PendingReviewItem[]> {
  return fetchByStatus('pending');
}

export async function listConfirmedReviewProducts(): Promise<PendingReviewItem[]> {
  return fetchByStatus('confirmed');
}

export interface PendingReviewEdits {
  productName?: string;
  nameHint?: string;
  id_producto?: string;
}

export interface ApplyPendingResult {
  ok: boolean;
  reason?: string;
  id_producto?: string;
  productName?: string;
}

export async function dismissPendingReviewItem(item: PendingReviewItem): Promise<boolean> {
  const ean = item.ean.replace(/\D/g, '');
  if (!ean) return false;

  try {
    await setDoc(
      doc(db, PENDING_COLLECTION, ean),
      {
        status: 'dismissed',
        dismissedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo descartar pendiente:', error);
    return false;
  }
}

export async function updatePendingReviewItem(
  item: PendingReviewItem,
  edits: PendingReviewEdits
): Promise<boolean> {
  const ean = item.ean.replace(/\D/g, '');
  if (!ean) return false;

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (edits.productName !== undefined) {
    payload.productName = edits.productName.trim() || null;
  }
  if (edits.nameHint !== undefined) {
    payload.nameHint = edits.nameHint.trim() || null;
  }
  if (edits.id_producto !== undefined) {
    payload.id_producto = edits.id_producto.trim() || null;
  }

  try {
    await setDoc(doc(db, PENDING_COLLECTION, ean), payload, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo actualizar pendiente:', error);
    return false;
  }
}

export async function applyPendingReviewItem(
  item: PendingReviewItem,
  overrides?: PendingReviewEdits
): Promise<ApplyPendingResult> {
  const ean = item.ean.replace(/\D/g, '');
  const supermarketId = item.supermarketId.trim();

  if (!ean || !supermarketId) {
    return { ok: false, reason: 'EAN o supermercado inválido' };
  }

  if (overrides) {
    const saved = await updatePendingReviewItem(item, overrides);
    if (!saved) {
      return { ok: false, reason: 'No se pudieron guardar los cambios' };
    }
  }

  let id_producto = (overrides?.id_producto ?? item.id_producto)?.trim();
  let productName = overrides?.productName ?? item.productName;

  if (!id_producto) {
    const mapping = await getEanProductMapping(ean, supermarketId);
    id_producto = mapping?.id_producto;
    productName = productName ?? mapping?.productName;
  }

  if (!id_producto) {
    return {
      ok: false,
      reason: 'Sin asociación manual EAN-ID. Vinculá el producto desde la app primero.',
    };
  }

  const saved = await saveEanProductMapping({
    ean,
    supermercado: supermarketId,
    id_producto,
    supermarketName: item.supermarketName,
    productName,
    source: 'manual_search',
  });

  if (!saved) {
    return { ok: false, reason: 'No se pudo guardar la asociación en Firestore' };
  }

  try {
    await setDoc(
      doc(db, PENDING_COLLECTION, ean),
      {
        status: 'confirmed',
        id_producto,
        productName: productName ?? null,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true, id_producto, productName };
  } catch (error) {
    console.warn('[Firestore] Asociación guardada pero falló actualizar pendiente:', error);
    return { ok: false, reason: 'No se pudo mover a confirmados' };
  }
}

/** Guarda el ID vinculado manualmente en el reporte pendiente (para el panel admin). */
export async function markPendingProductLinked(payload: {
  ean: string;
  supermarketId: string;
  id_producto: string;
  productName?: string;
}): Promise<void> {
  const ean = payload.ean.replace(/\D/g, '');
  if (!ean || !payload.id_producto) return;

  try {
    await setDoc(
      doc(db, PENDING_COLLECTION, ean),
      {
        id_producto: payload.id_producto,
        productName: payload.productName ?? null,
        supermarketId: payload.supermarketId,
        linkedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('[Firestore] No se pudo marcar vínculo en pendiente:', error);
  }
}

export async function applyAllPendingReviewItems(
  items: PendingReviewItem[]
): Promise<{ applied: number; failed: number }> {
  let applied = 0;
  let failed = 0;

  for (const item of items) {
    const result = await applyPendingReviewItem(item);
    if (result.ok) {
      applied += 1;
    } else {
      failed += 1;
    }
  }

  return { applied, failed };
}

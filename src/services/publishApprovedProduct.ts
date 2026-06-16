import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';

/** Catálogo global en Firestore. Solo se escribe al aprobar un producto NUEVO desde revisión admin. */
const COLLECTION = 'Productos';

export interface PublishProductPayload {
  barcode: string;
  supermarketId: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  price: number;
}

export async function publishApprovedProduct(payload: PublishProductPayload): Promise<boolean> {
  const barcode = payload.barcode.replace(/\D/g, '').padStart(13, '0').slice(-13);
  const name = payload.name.trim();
  const supermarketId = payload.supermarketId.trim();
  const price = Math.round(payload.price);

  if (!barcode || !name || !supermarketId || price <= 0) return false;

  try {
    const existing = await getDoc(doc(db, COLLECTION, barcode));
    if (existing.exists()) {
      const data = existing.data() as Record<string, unknown>;
      const existingName =
        (typeof data.Nombre === 'string' && data.Nombre) ||
        (typeof data.nombre === 'string' && data.nombre) ||
        (typeof data.name === 'string' && data.name) ||
        '';
      if (existingName.trim()) {
        console.warn(
          `[Firestore] EAN ${barcode} ya existe en catálogo. No se sobrescribe desde propuesta de usuario.`
        );
        return false;
      }
    }

    await setDoc(
      doc(db, COLLECTION, barcode),
      {
        barcode,
        Nombre: name,
        Marca: payload.brand?.trim() || null,
        Imagen: payload.imageUrl?.trim() || null,
        [`Precios.${supermarketId}`]: price,
        source: 'user_proposal_approved',
        approvedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo publicar producto aprobado:', error);
    return false;
  }
}

/** Actualiza solo el precio en catálogo cuando hay consenso de usuarios (producto ya existente o no). */
export async function publishCrowdPriceUpdate(payload: {
  barcode: string;
  supermarketId: string;
  price: number;
  productName?: string;
  consensusCount?: number;
}): Promise<boolean> {
  const barcode = payload.barcode.replace(/\D/g, '').padStart(13, '0').slice(-13);
  const supermarketId = payload.supermarketId.trim();
  const price = Math.round(payload.price);

  if (!barcode || !supermarketId || price <= 0) return false;

  try {
    await setDoc(
      doc(db, COLLECTION, barcode),
      {
        barcode,
        [`Precios.${supermarketId}`]: price,
        source: 'crowd_consensus',
        crowdConsensusCount: payload.consensusCount ?? null,
        crowdUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        ...(payload.productName ? { Nombre: payload.productName.trim() } : {}),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo publicar precio por consenso:', error);
    return false;
  }
}

import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';

const COLLECTION = 'Asociaciones_EAN';

export interface EanProductMapping {
  ean: string;
  supermercado: string;
  id_producto: string;
  supermarketName?: string;
  productName?: string;
  source?: 'manual_search' | 'prefix_strip';
}

function mappingDocId(ean: string, supermarketId: string): string {
  return `${ean}_${supermarketId}`;
}

export async function saveEanProductMapping(mapping: EanProductMapping): Promise<boolean> {
  const ean = mapping.ean.replace(/\D/g, '');
  const supermercado = mapping.supermercado.trim();
  const id_producto = mapping.id_producto.trim();

  if (!ean || !supermercado || !id_producto) return false;

  try {
    await setDoc(
      doc(db, COLLECTION, mappingDocId(ean, supermercado)),
      {
        ean,
        supermercado,
        id_producto,
        supermarketName: mapping.supermarketName ?? null,
        productName: mapping.productName ?? null,
        source: mapping.source ?? 'manual_search',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo guardar asociación EAN:', error);
    return false;
  }
}

export async function getEanProductMapping(
  ean: string,
  supermarketId: string
): Promise<EanProductMapping | null> {
  const normalized = ean.replace(/\D/g, '');
  if (!normalized || !supermarketId) return null;

  try {
    const snapshot = await getDoc(doc(db, COLLECTION, mappingDocId(normalized, supermarketId)));
    if (!snapshot.exists()) return null;

    const data = snapshot.data() as Record<string, unknown>;
    const id_producto =
      typeof data.id_producto === 'string'
        ? data.id_producto
        : typeof data.productoId === 'string'
          ? data.productoId
          : '';

    if (!id_producto) return null;

    return {
      ean: typeof data.ean === 'string' ? data.ean : normalized,
      supermercado:
        typeof data.supermercado === 'string'
          ? data.supermercado
          : typeof data.supermarketId === 'string'
            ? data.supermarketId
            : supermarketId,
      id_producto,
      supermarketName:
        typeof data.supermarketName === 'string' ? data.supermarketName : undefined,
      productName: typeof data.productName === 'string' ? data.productName : undefined,
      source: 'manual_search',
    };
  } catch (error) {
    console.warn('[Firestore] No se pudo leer asociación EAN:', error);
    return null;
  }
}

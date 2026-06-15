import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

import { storage } from '../../firebaseConfig.js';

type ProductImageFolder = 'pending-products' | 'product-images';

async function uploadProductImageToStorage(
  localUri: string,
  folder: ProductImageFolder,
  barcode: string
): Promise<string | null> {
  const ean = barcode.replace(/\D/g, '');
  if (!ean || !localUri) return null;

  try {
    const response = await fetch(localUri);
    const blob = await response.blob();
    const path = `${folder}/${ean}/${Date.now()}.jpg`;
    const storageRef = ref(storage, path);

    await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' });
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.warn(`[Storage] No se pudo subir foto (${folder}):`, error);
    return null;
  }
}

/** Foto enviada por el usuario al proponer un producto nuevo. */
export async function uploadPendingProductImage(
  localUri: string,
  barcode: string
): Promise<string | null> {
  return uploadProductImageToStorage(localUri, 'pending-products', barcode);
}

/** Imagen final subida por admin al revisar/aprobar (catálogo). */
export async function uploadCatalogProductImage(
  localUri: string,
  barcode: string
): Promise<string | null> {
  return uploadProductImageToStorage(localUri, 'product-images', barcode);
}

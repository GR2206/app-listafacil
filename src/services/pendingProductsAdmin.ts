import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  limit,
} from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';
import { getEanProductMapping, saveEanProductMapping } from '@/services/eanProductMapping';
import { extractCatalogPricesFromFirestore } from '@/services/firebaseProducts';
import { publishApprovedProduct } from '@/services/publishApprovedProduct';

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
  brand?: string;
  price?: number;
  imageUrl?: string;
  proposalType?: 'new_product' | 'catalog_link' | string;
  status: 'pending' | 'confirmed' | string;
  source?: string;
}

export function isUserProductProposal(item: PendingReviewItem): boolean {
  if (item.proposalType === 'new_product' || item.source === 'user_proposal') return true;
  if (item.id_producto) return false;
  return Boolean(item.productName && (item.brand || item.price || item.imageUrl));
}

export function getPendingReviewDisplayName(item: PendingReviewItem): string {
  return (
    item.productName?.trim() ||
    item.nameHint?.trim() ||
    (item.brand ? `${item.brand}` : '') ||
    'Producto sin identificar'
  );
}

export function getPendingReviewProposalFields(item: PendingReviewItem): {
  productName: string;
  brand: string;
  priceLabel: string;
  hasProposalData: boolean;
} {
  const productName = item.productName?.trim() || item.nameHint?.trim() || '';
  const brand = item.brand?.trim() || '';
  const priceLabel =
    item.price != null && item.price > 0 ? `$${item.price.toLocaleString('es-AR')}` : '';

  return {
    productName: productName || '—',
    brand: brand || '—',
    priceLabel: priceLabel || '—',
    hasProposalData: Boolean(productName || brand || priceLabel),
  };
}

function readPendingString(data: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function readPendingPrice(data: Record<string, unknown>, supermarketId?: string): number | undefined {
  const direct = data.price ?? data.userPrice ?? data.precio ?? data.Precio ?? data.proposedPrice;
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return Math.round(direct);
  }
  if (typeof direct === 'string') {
    const parsed = parseFloat(direct.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }

  if (supermarketId) {
    const { prices } = extractCatalogPricesFromFirestore(data);
    const catalogPrice = prices[supermarketId];
    if (catalogPrice != null && catalogPrice > 0) return catalogPrice;
  }

  return undefined;
}

async function enrichPendingReviewItem(item: PendingReviewItem): Promise<PendingReviewItem> {
  if (item.productName && item.brand && item.price && item.price > 0) {
    return item;
  }

  try {
    const productSnap = await getDoc(doc(db, 'Productos', item.ean));
    if (!productSnap.exists()) return item;

    const data = productSnap.data() as Record<string, unknown>;
    const catalogName = readPendingString(data, 'Nombre', 'nombre', 'name');
    const catalogBrand = readPendingString(data, 'Marca', 'marca', 'brand');
    const catalogPrice = readPendingPrice(data, item.supermarketId);
    const catalogImage = readPendingString(data, 'Imagen', 'imagen', 'imageUrl', 'image');

    return {
      ...item,
      productName: item.productName ?? catalogName,
      brand: item.brand ?? catalogBrand,
      price: item.price ?? catalogPrice,
      imageUrl: item.imageUrl ?? catalogImage,
    };
  } catch {
    return item;
  }
}

async function enrichPendingReviewItems(items: PendingReviewItem[]): Promise<PendingReviewItem[]> {
  return Promise.all(items.map((item) => enrichPendingReviewItem(item)));
}

/** Explica en lenguaje claro qué está proponiendo el usuario. */
export function describePendingUserProposal(item: PendingReviewItem): string[] {
  const lines: string[] = [];

  if (isUserProductProposal(item)) {
    lines.push(
      'El usuario cargó manualmente este producto porque no figura en la web del supermercado.'
    );
    if (item.productName) {
      lines.push(`Nombre propuesto: «${item.productName}».`);
    }
    if (item.brand) {
      lines.push(`Marca: «${item.brand}».`);
    }
    if (item.price && item.price > 0) {
      lines.push(`Precio en góndola: $${item.price}.`);
    }
    if (item.imageUrl) {
      lines.push('Incluye foto del producto para revisión.');
    }
    lines.push('Al aprobar, se publicará en el catálogo de Lista Fácil para futuros escaneos.');
    lines.push(
      'Esta propuesta llegó desde la app de un usuario (no solo desde tu dispositivo). Cada envío queda como pedido separado.'
    );
    return lines;
  }

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

  const priceRaw =
    data.price ??
    data.userPrice ??
    data.precio ??
    data.Precio ??
    data.proposedPrice;
  const price =
    readPendingPrice(
      {
        ...data,
        price: priceRaw,
      },
      supermarketId
    ) ?? undefined;

  const imageUrl =
    readPendingString(data, 'imageUrl', 'userImageUrl', 'Imagen', 'imagen', 'image') ??
    undefined;

  return {
    id,
    ean: ean.replace(/\D/g, '') || id,
    supermarketId,
    supermarketName:
      readPendingString(data, 'supermarketName', 'supermarket_name') ??
      undefined,
    nameHint: readPendingString(data, 'nameHint', 'scanNameHint') ?? undefined,
    rawScan: readPendingString(data, 'rawScan') ?? undefined,
    id_producto,
    productName:
      readPendingString(
        data,
        'productName',
        'Nombre',
        'nombre',
        'name',
        'proposedName',
        'titulo'
      ) ?? undefined,
    brand:
      readPendingString(data, 'brand', 'userBrand', 'Marca', 'marca', 'proposedBrand') ??
      undefined,
    price,
    imageUrl,
    proposalType:
      typeof data.proposalType === 'string' ? data.proposalType : undefined,
    status: typeof data.status === 'string' ? data.status : 'pending',
    source: typeof data.source === 'string' ? data.source : undefined,
  };
}

function pendingDocRef(item: PendingReviewItem) {
  return doc(db, PENDING_COLLECTION, item.id);
}

async function fetchByStatus(status: 'pending' | 'confirmed'): Promise<PendingReviewItem[]> {
  try {
    const snapshot = await getDocs(
      query(
        collection(db, PENDING_COLLECTION),
        where('status', '==', status),
        limit(120)
      )
    );

    return enrichPendingReviewItems(
      snapshot.docs
        .map((docSnap) => mapPendingDoc(docSnap.id, docSnap.data() as Record<string, unknown>))
        .sort((a, b) => {
          const aUser = isUserProductProposal(a) ? 0 : 1;
          const bUser = isUserProductProposal(b) ? 0 : 1;
          if (aUser !== bUser) return aUser - bUser;
          return a.ean.localeCompare(b.ean);
        })
    );
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
  brand?: string;
  price?: number;
  imageUrl?: string;
}

export interface ApplyPendingResult {
  ok: boolean;
  reason?: string;
  id_producto?: string;
  productName?: string;
}

export async function dismissPendingReviewItem(item: PendingReviewItem): Promise<boolean> {
  if (!item.id) return false;

  try {
    await setDoc(
      pendingDocRef(item),
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
  if (!item.id) return false;

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
  if (edits.brand !== undefined) {
    payload.brand = edits.brand.trim() || null;
  }
  if (edits.price !== undefined) {
    payload.price = edits.price > 0 ? Math.round(edits.price) : null;
  }
  if (edits.imageUrl !== undefined) {
    payload.imageUrl = edits.imageUrl.trim() || null;
  }

  try {
    await setDoc(pendingDocRef(item), payload, { merge: true });
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo actualizar pendiente:', error);
    return false;
  }
}

async function applyUserProductProposal(
  item: PendingReviewItem,
  productName: string,
  brand?: string,
  imageUrl?: string,
  price?: number
): Promise<ApplyPendingResult> {
  const ean = item.ean.replace(/\D/g, '');
  const supermarketId = item.supermarketId.trim();
  const resolvedPrice = price ?? item.price ?? 0;

  if (!productName.trim()) {
    return { ok: false, reason: 'Falta el nombre del producto' };
  }
  if (resolvedPrice <= 0) {
    return { ok: false, reason: 'Falta un precio válido en góndola' };
  }

  const published = await publishApprovedProduct({
    barcode: ean,
    supermarketId,
    name: productName.trim(),
    brand,
    imageUrl,
    price: resolvedPrice,
  });

  if (!published) {
    return {
      ok: false,
      reason:
        'No se pudo publicar en Productos. Si el EAN ya existe en catálogo, esta propuesta solo aplica a productos nuevos.',
    };
  }

  await saveEanProductMapping({
    ean,
    supermercado: supermarketId,
    id_producto: ean,
    supermarketName: item.supermarketName,
    productName: productName.trim(),
    source: 'manual_search',
  });

  try {
    await setDoc(
      pendingDocRef(item),
      {
        status: 'confirmed',
        id_producto: ean,
        productName: productName.trim(),
        brand: brand?.trim() || null,
        price: Math.round(resolvedPrice),
        imageUrl: imageUrl?.trim() || null,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true, id_producto: ean, productName: productName.trim() };
  } catch (error) {
    console.warn('[Firestore] Producto publicado pero falló actualizar pendiente:', error);
    return { ok: false, reason: 'Producto publicado pero no se pudo mover a confirmados' };
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

  const productName = overrides?.productName ?? item.productName;
  const brand = overrides?.brand ?? item.brand;
  const imageUrl = overrides?.imageUrl ?? item.imageUrl;
  const price = overrides?.price ?? item.price;

  if (isUserProductProposal(item)) {
    if (!productName?.trim()) {
      return { ok: false, reason: 'Completá el nombre del producto antes de aprobar' };
    }
    return applyUserProductProposal(item, productName, brand, imageUrl, price);
  }

  let id_producto = (overrides?.id_producto ?? item.id_producto)?.trim();
  let resolvedName = productName;

  if (!id_producto) {
    const mapping = await getEanProductMapping(ean, supermarketId);
    id_producto = mapping?.id_producto;
    resolvedName = resolvedName ?? mapping?.productName;
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
    productName: resolvedName,
    source: 'manual_search',
  });

  if (!saved) {
    return { ok: false, reason: 'No se pudo guardar la asociación en Firestore' };
  }

  try {
    await setDoc(
      pendingDocRef(item),
      {
        status: 'confirmed',
        id_producto,
        productName: resolvedName ?? null,
        appliedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return { ok: true, id_producto, productName: resolvedName };
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

export async function dismissAllPendingReviewItems(
  items: PendingReviewItem[]
): Promise<{ dismissed: number; failed: number }> {
  let dismissed = 0;
  let failed = 0;

  for (const item of items) {
    const ok = await dismissPendingReviewItem(item);
    if (ok) {
      dismissed += 1;
    } else {
      failed += 1;
    }
  }

  return { dismissed, failed };
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

import { create } from 'zustand';
import {
  saveCartItems,
  loadCartItems,
  sessionIdFor,
  getActiveCartSession,
} from '@/db/database';
import { prepareSupermarketSession } from '@/db/seed';
import type { CartLine, Product } from '@/types';
import { createManualBarcode } from '@/utils/manualProduct';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function mergeProductIntoLine(line: CartLine, product: Product): CartLine {
  return {
    ...line,
    quantity: line.quantity + 1,
    scannedAt: Date.now(),
    name: product.name || line.name,
    brand: product.brand ?? line.brand,
    imageUrl: product.imageUrl ?? line.imageUrl,
    unitPrice: product.price > 0 ? product.price : line.unitPrice,
  };
}

function productToCartLine(product: Product, quantity = 1): CartLine {
  return {
    id: generateId(),
    productId: product.id,
    barcode: product.barcode,
    name: product.name,
    brand: product.brand,
    imageUrl: product.imageUrl,
    unitPrice: product.price > 0 ? product.price : 0,
    quantity,
    supermarketId: product.supermarketId,
    scannedAt: Date.now(),
  };
}

interface CartState {
  supermarketId: string | null;
  supermarketName: string | null;
  items: CartLine[];
  isHydrated: boolean;
  setSupermarket: (id: string, name: string) => Promise<void>;
  hydrate: () => Promise<void>;
  addProduct: (product: Product) => string;
  addManualProduct: (name: string, price: number, supermarketId: string) => string;
  updateItem: (
    lineId: string,
    updates: { quantity?: number; unitPrice?: number }
  ) => void;
  remove: (lineId: string) => void;
  restoreItem: (line: CartLine) => void;
  clear: () => Promise<void>;
  getTotal: () => number;
  getItemById: (lineId: string) => CartLine | undefined;
}

function currentSessionId(supermarketId: string | null): string | null {
  return supermarketId ? sessionIdFor(supermarketId) : null;
}

async function persist(
  supermarketId: string | null,
  items: CartLine[]
): Promise<void> {
  const sessionId = currentSessionId(supermarketId);
  if (!sessionId) return;
  await saveCartItems(
    sessionId,
    items.filter((item) => !item.isManual)
  );
}

let persistQueue: Promise<void> = Promise.resolve();
let persistDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingPersist: { supermarketId: string | null; items: CartLine[] } | null = null;

function flushPendingPersist(): void {
  const snapshot = pendingPersist;
  pendingPersist = null;
  if (!snapshot) return;

  const job = persistQueue.then(() => persist(snapshot.supermarketId, snapshot.items));
  persistQueue = job.catch(() => {});
}

function schedulePersist(
  supermarketId: string | null,
  items: CartLine[],
  immediate = false
): Promise<void> {
  pendingPersist = { supermarketId, items };

  if (persistDebounceTimer) {
    clearTimeout(persistDebounceTimer);
    persistDebounceTimer = null;
  }

  if (immediate) {
    flushPendingPersist();
    return persistQueue;
  }

  persistDebounceTimer = setTimeout(() => {
    persistDebounceTimer = null;
    flushPendingPersist();
  }, 220);

  return persistQueue;
}

function mergeManualItems(
  persistedItems: CartLine[],
  currentItems: CartLine[],
  supermarketId: string
): CartLine[] {
  const manualItems = currentItems.filter(
    (item) => item.isManual && item.supermarketId === supermarketId
  );
  if (manualItems.length === 0) return persistedItems;
  return [...manualItems, ...persistedItems];
}

export const useCartStore = create<CartState>((set, get) => ({
  supermarketId: null,
  supermarketName: null,
  items: [],
  isHydrated: false,

  setSupermarket: async (id, name) => {
    await prepareSupermarketSession(id, name);
    const persistedItems = await loadCartItems(sessionIdFor(id), id);
    const { items: currentItems } = get();
    set({
      supermarketId: id,
      supermarketName: name,
      items: mergeManualItems(persistedItems, currentItems, id),
      isHydrated: true,
    });
  },

  hydrate: async () => {
    const active = await getActiveCartSession();
    if (active) {
      const items = await loadCartItems(active.id, active.supermarketId);
      set({
        supermarketId: active.supermarketId,
        supermarketName: active.supermarketName,
        items,
        isHydrated: true,
      });
      return;
    }
    set({ isHydrated: true });
  },

  addProduct: (product) => {
    const { items, supermarketId } = get();
    const existing = items.find((i) => i.barcode === product.barcode);

    let affectedId: string;
    let next: CartLine[];

    if (existing) {
      const updated = mergeProductIntoLine(existing, product);
      affectedId = updated.id;
      next = [updated, ...items.filter((i) => i.id !== existing.id)];
    } else {
      const line = productToCartLine(product);
      affectedId = line.id;
      next = [line, ...items];
    }

    set({ items: next });
    void schedulePersist(supermarketId, next);
    return affectedId;
  },

  addManualProduct: (name, price, supermarketId) => {
    const trimmedName = name.trim();
    if (!trimmedName || price <= 0) return '';

    const { items } = get();
    const id = generateId();
    const line: CartLine = {
      id,
      productId: id,
      barcode: createManualBarcode(),
      name: trimmedName,
      unitPrice: Math.round(price * 100) / 100,
      quantity: 1,
      supermarketId,
      scannedAt: Date.now(),
      isManual: true,
    };

    const next = [line, ...items];
    set({ items: next });
    return id;
  },

  updateItem: (lineId, updates) => {
    const { items, supermarketId } = get();
    const next = items
      .map((i) =>
        i.id === lineId
          ? {
              ...i,
              ...(updates.quantity !== undefined
                ? { quantity: Math.max(0, updates.quantity) }
                : {}),
              ...(updates.unitPrice !== undefined
                ? { unitPrice: updates.unitPrice }
                : {}),
            }
          : i
      )
      .filter((i) => i.quantity > 0);
    set({ items: next });
    void schedulePersist(supermarketId, next);
  },

  getItemById: (lineId) => get().items.find((i) => i.id === lineId),

  remove: (lineId) => {
    const { items, supermarketId } = get();
    const next = items.filter((i) => i.id !== lineId);
    set({ items: next });
    void schedulePersist(supermarketId, next);
  },

  restoreItem: (line) => {
    const { items, supermarketId } = get();
    if (items.some((item) => item.id === line.id)) return;
    const next = [line, ...items];
    set({ items: next });
    void schedulePersist(supermarketId, next);
  },

  clear: () => {
    const { supermarketId } = get();
    set({ items: [] });
    return schedulePersist(supermarketId, [], true);
  },

  getTotal: () =>
    get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),
}));

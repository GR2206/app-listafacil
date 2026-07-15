import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';
import type { SharedShoppingList, ShoppingListItem } from '@/types/shoppingList';

const COLLECTION = 'Listas_compartidas';
const DRAFT_STORAGE_KEY = 'shopping_list_draft_v1';

function createListId(): string {
  return `lista_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

let itemIdSeq = 0;

function createItemId(): string {
  itemIdSeq += 1;
  return `item_${Date.now().toString(36)}_${itemIdSeq.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createEmptyShoppingListItem(): ShoppingListItem {
  return {
    id: createItemId(),
    text: '',
    checked: false,
  };
}

export function normalizeShoppingListItems(items: ShoppingListItem[]): ShoppingListItem[] {
  return items
    .filter((item) => item && typeof item.id === 'string')
    .map((item) => ({
      id: item.id,
      text: typeof item.text === 'string' ? item.text : '',
      checked: Boolean(item.checked),
    }));
}

function mapFirestoreList(id: string, data: Record<string, unknown>): SharedShoppingList {
  const rawItems = Array.isArray(data.items) ? data.items : [];
  const items = normalizeShoppingListItems(
    rawItems.map((entry, index) => {
      const row = entry as Record<string, unknown>;
      return {
        id: typeof row.id === 'string' ? row.id : `item_${index}`,
        text: typeof row.text === 'string' ? row.text : '',
        checked: Boolean(row.checked),
      };
    })
  );

  return {
    id,
    title: typeof data.title === 'string' ? data.title : undefined,
    items,
    updatedAt:
      typeof data.updatedAt === 'string'
        ? data.updatedAt
        : typeof data.updatedAtClient === 'string'
          ? data.updatedAtClient
          : undefined,
  };
}

export async function loadDraftShoppingList(): Promise<ShoppingListItem[]> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return [createEmptyShoppingListItem()];

    const parsed = JSON.parse(raw) as ShoppingListItem[];
    const items = normalizeShoppingListItems(parsed);
    return items.length > 0 ? items : [createEmptyShoppingListItem()];
  } catch {
    return [createEmptyShoppingListItem()];
  }
}

export async function saveDraftShoppingList(items: ShoppingListItem[]): Promise<void> {
  await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(normalizeShoppingListItems(items)));
}

export async function clearDraftShoppingList(): Promise<void> {
  await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
}

export async function deleteSharedShoppingList(listId: string): Promise<boolean> {
  if (!listId.trim()) return false;

  try {
    await deleteDoc(doc(db, COLLECTION, listId.trim()));
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo eliminar lista compartida:', error);
    return false;
  }
}

export async function loadSharedShoppingList(listId: string): Promise<SharedShoppingList | null> {
  if (!listId.trim()) return null;

  try {
    const snapshot = await getDoc(doc(db, COLLECTION, listId.trim()));
    if (!snapshot.exists()) return null;
    return mapFirestoreList(snapshot.id, snapshot.data() as Record<string, unknown>);
  } catch (error) {
    console.warn('[Firestore] No se pudo cargar lista compartida:', error);
    return null;
  }
}

export async function saveSharedShoppingList(
  items: ShoppingListItem[],
  listId?: string | null
): Promise<string | null> {
  const normalized = normalizeShoppingListItems(items).filter((item) => item.text.trim());
  if (normalized.length === 0) return null;

  const id = listId?.trim() || createListId();
  const nowIso = new Date().toISOString();

  try {
    await setDoc(
      doc(db, COLLECTION, id),
      {
        items: normalized,
        updatedAt: serverTimestamp(),
        updatedAtClient: nowIso,
        ...(listId ? {} : { createdAt: serverTimestamp(), createdAtClient: nowIso }),
      },
      { merge: true }
    );
    return id;
  } catch (error) {
    console.warn('[Firestore] No se pudo guardar lista compartida:', error);
    return null;
  }
}

export async function syncSharedShoppingList(
  listId: string,
  items: ShoppingListItem[]
): Promise<boolean> {
  const normalized = normalizeShoppingListItems(items);
  if (!listId.trim()) return false;

  try {
    await setDoc(
      doc(db, COLLECTION, listId.trim()),
      {
        items: normalized,
        updatedAt: serverTimestamp(),
        updatedAtClient: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn('[Firestore] No se pudo sincronizar lista compartida:', error);
    return false;
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '../../firebaseConfig.js';
import type {
  LocalShoppingList,
  SharedShoppingList,
  ShoppingListItem,
} from '@/types/shoppingList';

const COLLECTION = 'Listas_compartidas';
const DRAFT_STORAGE_KEY = 'shopping_list_draft_v1';
const LISTS_STORAGE_KEY = 'shopping_lists_v2';
const ACTIVE_LIST_KEY = 'shopping_lists_active_v2';

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

function defaultTitle(index = 0): string {
  return index <= 0 ? 'Mi lista' : `Lista ${index + 1}`;
}

function normalizeLocalList(raw: unknown, fallbackIndex = 0): LocalShoppingList | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<LocalShoppingList>;
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : createListId();
  const title =
    typeof source.title === 'string' && source.title.trim()
      ? source.title.trim()
      : defaultTitle(fallbackIndex);
  const items = normalizeShoppingListItems(
    Array.isArray(source.items) ? source.items : [createEmptyShoppingListItem()]
  );

  return {
    id,
    title,
    items: items.length > 0 ? items : [createEmptyShoppingListItem()],
    updatedAt:
      typeof source.updatedAt === 'string' && source.updatedAt
        ? source.updatedAt
        : new Date().toISOString(),
    sharedId:
      typeof source.sharedId === 'string' && source.sharedId.trim()
        ? source.sharedId.trim()
        : null,
  };
}

async function migrateLegacyDraftIfNeeded(): Promise<{
  lists: LocalShoppingList[];
  activeId: string;
} | null> {
  try {
    const existing = await AsyncStorage.getItem(LISTS_STORAGE_KEY);
    if (existing) return null;

    const rawDraft = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
    const items = rawDraft
      ? normalizeShoppingListItems(JSON.parse(rawDraft) as ShoppingListItem[])
      : [createEmptyShoppingListItem()];

    const list: LocalShoppingList = {
      id: createListId(),
      title: 'Mi lista',
      items: items.length > 0 ? items : [createEmptyShoppingListItem()],
      updatedAt: new Date().toISOString(),
      sharedId: null,
    };

    await AsyncStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify([list]));
    await AsyncStorage.setItem(ACTIVE_LIST_KEY, list.id);
    return { lists: [list], activeId: list.id };
  } catch {
    return null;
  }
}

export async function loadLocalShoppingLists(): Promise<{
  lists: LocalShoppingList[];
  activeId: string;
}> {
  const migrated = await migrateLegacyDraftIfNeeded();
  if (migrated) return migrated;

  try {
    const [rawLists, rawActive] = await Promise.all([
      AsyncStorage.getItem(LISTS_STORAGE_KEY),
      AsyncStorage.getItem(ACTIVE_LIST_KEY),
    ]);

    const parsed = rawLists ? (JSON.parse(rawLists) as unknown[]) : [];
    const lists = parsed
      .map((entry, index) => normalizeLocalList(entry, index))
      .filter((entry): entry is LocalShoppingList => entry !== null);

    if (lists.length === 0) {
      const list: LocalShoppingList = {
        id: createListId(),
        title: 'Mi lista',
        items: [createEmptyShoppingListItem()],
        updatedAt: new Date().toISOString(),
        sharedId: null,
      };
      await AsyncStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify([list]));
      await AsyncStorage.setItem(ACTIVE_LIST_KEY, list.id);
      return { lists: [list], activeId: list.id };
    }

    const activeId =
      rawActive && lists.some((list) => list.id === rawActive) ? rawActive : lists[0].id;

    if (activeId !== rawActive) {
      await AsyncStorage.setItem(ACTIVE_LIST_KEY, activeId);
    }

    return { lists, activeId };
  } catch {
    const list: LocalShoppingList = {
      id: createListId(),
      title: 'Mi lista',
      items: [createEmptyShoppingListItem()],
      updatedAt: new Date().toISOString(),
      sharedId: null,
    };
    return { lists: [list], activeId: list.id };
  }
}

async function persistLists(lists: LocalShoppingList[], activeId: string): Promise<void> {
  await AsyncStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(lists));
  await AsyncStorage.setItem(ACTIVE_LIST_KEY, activeId);
}

export async function setActiveShoppingListId(listId: string): Promise<void> {
  const { lists } = await loadLocalShoppingLists();
  if (!lists.some((list) => list.id === listId)) return;
  await AsyncStorage.setItem(ACTIVE_LIST_KEY, listId);
}

export async function createLocalShoppingList(title?: string): Promise<LocalShoppingList> {
  const { lists, activeId } = await loadLocalShoppingLists();
  const trimmed = title?.trim();
  const nextTitle = trimmed || defaultTitle(lists.length);
  const list: LocalShoppingList = {
    id: createListId(),
    title: nextTitle,
    items: [createEmptyShoppingListItem()],
    updatedAt: new Date().toISOString(),
    sharedId: null,
  };
  const next = [...lists, list];
  await persistLists(next, list.id);
  void activeId;
  return list;
}

export async function renameLocalShoppingList(listId: string, title: string): Promise<void> {
  const { lists, activeId } = await loadLocalShoppingLists();
  const nextTitle = title.trim() || 'Mi lista';
  const next = lists.map((list) =>
    list.id === listId
      ? { ...list, title: nextTitle, updatedAt: new Date().toISOString() }
      : list
  );
  await persistLists(next, activeId);
}

export async function updateLocalShoppingListItems(
  listId: string,
  items: ShoppingListItem[],
  options?: { sharedId?: string | null }
): Promise<void> {
  const { lists, activeId } = await loadLocalShoppingLists();
  const normalized = normalizeShoppingListItems(items);
  const next = lists.map((list) =>
    list.id === listId
      ? {
          ...list,
          items: normalized.length > 0 ? normalized : [createEmptyShoppingListItem()],
          updatedAt: new Date().toISOString(),
          sharedId:
            options && 'sharedId' in options ? options.sharedId ?? null : list.sharedId ?? null,
        }
      : list
  );
  await persistLists(next, activeId);
}

/** Borra una pestaña. Si era la última, deja una vacía "Mi lista". */
export async function deleteLocalShoppingList(listId: string): Promise<{
  lists: LocalShoppingList[];
  activeId: string;
}> {
  const { lists, activeId } = await loadLocalShoppingLists();
  const target = lists.find((list) => list.id === listId);
  if (target?.sharedId) {
    await deleteSharedShoppingList(target.sharedId);
  }

  let next = lists.filter((list) => list.id !== listId);
  if (next.length === 0) {
    next = [
      {
        id: createListId(),
        title: 'Mi lista',
        items: [createEmptyShoppingListItem()],
        updatedAt: new Date().toISOString(),
        sharedId: null,
      },
    ];
  }

  const nextActive =
    activeId === listId
      ? next[0].id
      : next.some((list) => list.id === activeId)
        ? activeId
        : next[0].id;

  await persistLists(next, nextActive);
  return { lists: next, activeId: nextActive };
}

/** Compat: lee ítems de la lista activa. */
export async function loadDraftShoppingList(): Promise<ShoppingListItem[]> {
  const { lists, activeId } = await loadLocalShoppingLists();
  const active = lists.find((list) => list.id === activeId) ?? lists[0];
  return active?.items?.length ? active.items : [createEmptyShoppingListItem()];
}

/** Compat: guarda ítems en la lista activa. */
export async function saveDraftShoppingList(items: ShoppingListItem[]): Promise<void> {
  const { activeId } = await loadLocalShoppingLists();
  await updateLocalShoppingListItems(activeId, items);
}

export async function clearDraftShoppingList(): Promise<void> {
  const { activeId } = await loadLocalShoppingLists();
  await updateLocalShoppingListItems(activeId, [createEmptyShoppingListItem()], {
    sharedId: null,
  });
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
  listId?: string | null,
  title?: string | null
): Promise<string | null> {
  const normalized = normalizeShoppingListItems(items).filter((item) => item.text.trim());
  if (normalized.length === 0) return null;

  const id = listId?.trim() || createListId();
  const nowIso = new Date().toISOString();
  const trimmedTitle = title?.trim();

  try {
    await setDoc(
      doc(db, COLLECTION, id),
      {
        items: normalized,
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
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
  items: ShoppingListItem[],
  title?: string | null
): Promise<boolean> {
  const normalized = normalizeShoppingListItems(items);
  if (!listId.trim()) return false;
  const trimmedTitle = title?.trim();

  try {
    await setDoc(
      doc(db, COLLECTION, listId.trim()),
      {
        items: normalized,
        ...(trimmedTitle ? { title: trimmedTitle } : {}),
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

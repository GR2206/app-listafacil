import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  Share,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Keyboard,
  Modal,
  type KeyboardEvent,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { CartAccessibilityBar } from '@/components/cart/CartAccessibilityBar';
import { buildSharedShoppingListShareMessage } from '@/config/appLinks';
import { useCartListScale } from '@/context/CartListScaleContext';
import { useSupermarketTheme } from '@/context/ThemeContext';
import {
  createEmptyShoppingListItem,
  createLocalShoppingList,
  deleteLocalShoppingList,
  loadLocalShoppingLists,
  loadSharedShoppingList,
  renameLocalShoppingList,
  saveSharedShoppingList,
  setActiveShoppingListId,
  syncSharedShoppingList,
  updateLocalShoppingListItems,
} from '@/services/sharedShoppingList';
import { cartListColors as lc } from '@/theme/cartCompact';
import { radii } from '@/theme';
import type { LocalShoppingList, ShoppingListItem } from '@/types/shoppingList';
import { withClickSound } from '@/utils/withClickSound';
import { withTeclaSound } from '@/utils/withTeclaSound';

const SYNC_DEBOUNCE_MS = 900;
/** Espacio extra bajo la lista para que la fila activa quede arriba del teclado. */
const KEYBOARD_EXTRA_GAP = 96;

function ensureTrailingEmptyRow(items: ShoppingListItem[]): ShoppingListItem[] {
  if (items.length === 0) return [createEmptyShoppingListItem()];
  const last = items[items.length - 1];
  if (last.text.trim()) {
    return [...items, createEmptyShoppingListItem()];
  }
  return items;
}

/**
 * "arroz, fideos, aceite" / multilínea → un producto por renglón.
 * null = tipado normal (sin expandir).
 */
function parseBulkProductInput(text: string): string[] | null {
  if (!/[,;\n\r]/.test(text)) return null;

  const parts = text
    .split(/[,;\n\r]+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  if (parts.length === 0) return [''];

  // "arroz," al terminar con separador → cierra el renglón y sigue
  if (parts.length === 1 && /[,;\n\r]\s*$/.test(text)) {
    return parts;
  }

  if (parts.length >= 2) return parts;
  return null;
}

function parseBulkListText(text: string): string[] {
  return parseBulkProductInput(text) ?? [];
}

export default function CrearListaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const sharedListIdParam = Array.isArray(params.id) ? params.id[0] : params.id;

  const [lists, setLists] = useState<LocalShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState<string>('');
  const [items, setItems] = useState<ShoppingListItem[]>([createEmptyShoppingListItem()]);
  const [listTitle, setListTitle] = useState('Mi lista');
  const [sharedListId, setSharedListId] = useState<string | null>(sharedListIdParam?.trim() || null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [newTabVisible, setNewTabVisible] = useState(false);
  const [newTabTitle, setNewTabTitle] = useState('');
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [pasteVisible, setPasteVisible] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteImporting, setPasteImporting] = useState(false);
  /** Solo 1 TextInput montado: el resto es Text liviano. */
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  /** Desmonta la FlatList mientras se aplica un pegado masivo. */
  const [bulkImporting, setBulkImporting] = useState(false);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bulkLockRef = useRef(false);
  const pendingBulkRef = useRef<{ itemId: string | null; products: string[] } | null>(null);
  const itemsRef = useRef(items);
  const activeListIdRef = useRef(activeListId);
  const listTitleRef = useRef(listTitle);
  const sharedListIdRef = useRef(sharedListId);
  const inputRefs = useRef<Map<string, TextInput>>(new Map());
  const listRef = useRef<FlatList<ShoppingListItem>>(null);

  itemsRef.current = items;
  activeListIdRef.current = activeListId;
  listTitleRef.current = listTitle;
  sharedListIdRef.current = sharedListId;

  const switchToList = useCallback((list: LocalShoppingList) => {
    setActiveListId(list.id);
    setListTitle(list.title);
    setItems(ensureTrailingEmptyRow(list.items));
    setSharedListId(list.sharedId ?? null);
    setFocusedItemId(null);
    inputRefs.current.clear();
    void setActiveShoppingListId(list.id);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      const height = Math.round(event.endCoordinates?.height ?? 0);
      setKeyboardHeight(Number.isFinite(height) && height > 0 ? height : 0);
    };
    const onHide = () => setKeyboardHeight(0);

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          backgroundColor: c.listBackground,
        },
        header: {
          backgroundColor: theme.primary,
          paddingTop: insets.top,
          paddingHorizontal: c.margin,
          paddingBottom: 8,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        },
        backBtn: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        headerTitleBlock: {
          flex: 1,
          minWidth: 0,
        },
        headerTitle: {
          fontSize: Math.round(20 * (c.nameFontSize / 13)),
          fontWeight: '800',
          color: theme.textOnPrimary,
        },
        /** Barra tipo Chrome: pestañas inactivas sobre gris, activa blanca que fusiona con el contenido. */
        chromeTabBar: {
          backgroundColor: '#DEE1E6',
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingTop: 8,
          paddingHorizontal: 8,
          minHeight: 42,
        },
        tabScroll: {
          flexGrow: 1,
          flexShrink: 1,
        },
        tabScrollContent: {
          alignItems: 'flex-end',
          flexDirection: 'row',
          gap: 0,
          paddingRight: 8,
        },
        tab: {
          maxWidth: 160,
          minWidth: 72,
          paddingHorizontal: 14,
          paddingVertical: 9,
          marginRight: 2,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          backgroundColor: '#C9CCD1',
        },
        tabActive: {
          backgroundColor: lc.surface,
          marginBottom: 0,
        },
        tabText: {
          fontSize: Math.max(12, c.clearFontSize - 1),
          fontWeight: '600',
          color: '#3C4043',
        },
        tabTextActive: {
          fontWeight: '700',
          color: '#202124',
        },
        tabPlus: {
          width: 36,
          height: 36,
          marginLeft: 2,
          marginBottom: 2,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          alignSelf: 'flex-end',
        },
        shareBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingHorizontal: 10,
          paddingVertical: 7,
          borderRadius: radii.md,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.35)',
        },
        shareBtnText: {
          fontSize: c.clearFontSize,
          fontWeight: '800',
          color: theme.textOnPrimary,
        },
        toolbar: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: c.margin,
          paddingVertical: c.gap,
          backgroundColor: lc.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: lc.border,
        },
        toolbarBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          paddingVertical: 4,
          paddingHorizontal: 8,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: lc.border,
          backgroundColor: lc.surfaceElevated,
        },
        toolbarBtnText: {
          fontSize: c.clearFontSize,
          fontWeight: '700',
          color: lc.text,
        },
        deleteBtnText: {
          fontSize: c.clearFontSize,
          fontWeight: '700',
          color: theme.danger ?? '#C1121F',
        },
        pasteArea: {
          minHeight: 160,
          maxHeight: 280,
          textAlignVertical: 'top',
          borderWidth: 1,
          borderColor: lc.border,
          borderRadius: radii.md,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === 'ios' ? 12 : 8,
          fontSize: 15,
          color: lc.text,
          backgroundColor: lc.surfaceElevated,
        },
        tableHeader: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: c.margin,
          paddingVertical: 6,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: lc.border,
          backgroundColor: lc.surface,
        },
        tableHeaderCheck: {
          width: 36,
        },
        tableHeaderText: {
          flex: 1,
          fontSize: c.colHeaderFontSize,
          fontWeight: '700',
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: lc.textMuted,
        },
        tableHeaderRemove: {
          width: 32,
          marginLeft: 2,
        },
        listContent: {
          paddingBottom:
            Math.max(insets.bottom, 16) +
            48 +
            (keyboardHeight > 0
              ? Platform.OS === 'android'
                ? keyboardHeight + KEYBOARD_EXTRA_GAP
                : KEYBOARD_EXTRA_GAP + 120
              : 32),
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: c.rowMinHeight,
          paddingHorizontal: c.margin,
          paddingVertical: c.rowPaddingV,
          backgroundColor: lc.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: lc.border,
        },
        checkBtn: {
          width: 36,
          height: c.rowMinHeight,
          alignItems: 'center',
          justifyContent: 'center',
        },
        removeBtn: {
          width: 32,
          height: c.rowMinHeight,
          alignItems: 'center',
          justifyContent: 'center',
          marginLeft: 2,
        },
        removeBtnPlaceholder: {
          width: 32,
          marginLeft: 2,
        },
        input: {
          flex: 1,
          fontSize: c.nameFontSize,
          color: lc.text,
          paddingVertical: 6,
          minHeight: c.rowMinHeight - c.rowPaddingV * 2,
        },
        inputChecked: {
          textDecorationLine: 'line-through',
          color: lc.textSecondary,
        },
        rowTextBtn: {
          flex: 1,
          justifyContent: 'center',
          minHeight: c.rowMinHeight - c.rowPaddingV * 2,
          paddingVertical: 6,
        },
        rowText: {
          fontSize: c.nameFontSize,
          color: lc.text,
        },
        rowTextPlaceholder: {
          color: lc.textSecondary,
        },
        addBtn: {
          marginHorizontal: c.margin,
          marginTop: c.gap,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: lc.border,
          backgroundColor: lc.surfaceElevated,
          paddingVertical: 10,
        },
        addBtnText: {
          fontSize: c.sortChipFontSize,
          fontWeight: '700',
          color: lc.text,
        },
        loadingBox: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.listBackground,
        },
        bulkImportBox: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          paddingHorizontal: c.margin,
        },
        bulkImportText: {
          fontSize: c.nameFontSize,
          fontWeight: '700',
          color: lc.textMuted,
          textAlign: 'center',
        },
        modalBackdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          paddingHorizontal: 28,
        },
        modalCard: {
          borderRadius: radii.lg,
          padding: 18,
          backgroundColor: lc.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: lc.border,
          gap: 12,
        },
        modalTitle: {
          fontSize: 17,
          fontWeight: '800',
          color: lc.text,
        },
        modalHint: {
          fontSize: 13,
          color: lc.textSecondary,
          marginTop: -6,
        },
        modalInput: {
          borderWidth: 1,
          borderColor: lc.border,
          borderRadius: radii.md,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === 'ios' ? 12 : 8,
          fontSize: 16,
          color: lc.text,
          backgroundColor: lc.surfaceElevated,
        },
        modalActions: {
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: 8,
          marginTop: 4,
        },
        modalBtn: {
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: radii.md,
        },
        modalBtnText: {
          fontSize: 14,
          fontWeight: '800',
        },
      }),
    [c, insets.top, insets.bottom, theme, keyboardHeight]
  );

  const persistActiveList = useCallback(async (nextItems: ShoppingListItem[]) => {
    const listId = activeListIdRef.current;
    if (!listId) return;
    await updateLocalShoppingListItems(listId, nextItems, {
      sharedId: sharedListId,
    });
    setLists((current) =>
      current.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: nextItems,
              sharedId: sharedListId,
              updatedAt: new Date().toISOString(),
            }
          : list
      )
    );
  }, [sharedListId]);

  const scheduleRemoteSync = useCallback((remoteId: string, nextItems: ShoppingListItem[]) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncSharedShoppingList(remoteId, nextItems, listTitleRef.current);
    }, SYNC_DEBOUNCE_MS);
  }, []);

  const applyItems = useCallback(
    (updater: (current: ShoppingListItem[]) => ShoppingListItem[]) => {
      setItems((current) => {
        const updated = ensureTrailingEmptyRow(updater(current));
        void persistActiveList(updated);
        if (sharedListId) {
          scheduleRemoteSync(sharedListId, updated);
        }
        return updated;
      });
    },
    [persistActiveList, scheduleRemoteSync, sharedListId]
  );

  const focusRow = useCallback((itemId: string, listIndex?: number) => {
    setFocusedItemId(itemId);
    setTimeout(() => {
      inputRefs.current.get(itemId)?.focus();
      if (listIndex != null && listIndex >= 0) {
        try {
          listRef.current?.scrollToIndex({
            index: listIndex,
            animated: true,
            viewPosition: 0.12,
            viewOffset: 8,
          });
        } catch {
          // scrollToIndex puede fallar si el ítem aún no midió
        }
      }
    }, 80);
  }, []);

  /** Solo scrollea — no volver a focus() (evita loop nativo en Android). */
  const scrollRowIntoView = useCallback(
    (listIndex: number) => {
      if (listIndex < 0) return;
      const itemH = c.rowMinHeight + StyleSheet.hairlineWidth;
      const run = () => {
        try {
          listRef.current?.scrollToIndex({
            index: listIndex,
            animated: true,
            viewPosition: 0.12,
            viewOffset: 8,
          });
        } catch {
          listRef.current?.scrollToOffset({
            offset: Math.max(0, itemH * listIndex - 24),
            animated: true,
          });
        }
      };
      setTimeout(run, 50);
      setTimeout(run, 280);
    },
    [c.rowMinHeight]
  );

  useEffect(() => {
    if (keyboardHeight <= 0 || !focusedItemId) return;
    const index = itemsRef.current.findIndex((item) => item.id === focusedItemId);
    if (index >= 0) scrollRowIntoView(index);
  }, [keyboardHeight, focusedItemId, scrollRowIntoView]);

  const focusNextRow = useCallback(
    (itemId: string) => {
      const list = itemsRef.current;
      const index = list.findIndex((item) => item.id === itemId);
      if (index < 0) return;

      const withTrailing = ensureTrailingEmptyRow(list);
      const nextIndex = index + 1;
      const nextItem = withTrailing[nextIndex];

      if (withTrailing.length !== list.length) {
        applyItems(() => withTrailing);
      }

      if (nextItem) {
        focusRow(nextItem.id, nextIndex);
        return;
      }

      const newItem = createEmptyShoppingListItem();
      applyItems((current) => [...current, newItem]);
      focusRow(newItem.id, withTrailing.length);
    },
    [applyItems, focusRow]
  );

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        const registry = await loadLocalShoppingLists();
        if (cancelled) return;

        setLists(registry.lists);

        if (sharedListIdParam?.trim()) {
          const remote = await loadSharedShoppingList(sharedListIdParam.trim());
          if (cancelled) return;

          if (!remote) {
            Alert.alert(
              'Lista no encontrada',
              'No encontramos esta lista. Puede haber expirado o el enlace está incompleto.'
            );
            const active =
              registry.lists.find((list) => list.id === registry.activeId) ?? registry.lists[0];
            if (active) switchToList(active);
            router.replace('/crear-lista');
          } else {
            const existing = registry.lists.find((list) => list.sharedId === remote.id);
            if (existing) {
              await updateLocalShoppingListItems(existing.id, remote.items, {
                sharedId: remote.id,
              });
              const refreshed = await loadLocalShoppingLists();
              if (cancelled) return;
              setLists(refreshed.lists);
              const active =
                refreshed.lists.find((list) => list.id === existing.id) ?? refreshed.lists[0];
              if (active) {
                switchToList({
                  ...active,
                  items: ensureTrailingEmptyRow(remote.items),
                  sharedId: remote.id,
                  title: remote.title?.trim() || active.title,
                });
              }
            } else {
              const imported = await createLocalShoppingList(
                remote.title?.trim() || 'Lista compartida'
              );
              await updateLocalShoppingListItems(imported.id, remote.items, {
                sharedId: remote.id,
              });
              const refreshed = await loadLocalShoppingLists();
              if (cancelled) return;
              setLists(refreshed.lists);
              const active =
                refreshed.lists.find((list) => list.id === imported.id) ?? refreshed.lists[0];
              if (active) {
                switchToList({
                  ...active,
                  items: ensureTrailingEmptyRow(remote.items),
                  sharedId: remote.id,
                  title: remote.title?.trim() || active.title,
                });
              }
            }
          }
          setLoading(false);
          return;
        }

        const active =
          registry.lists.find((list) => list.id === registry.activeId) ?? registry.lists[0];
        if (active) switchToList(active);
        setLoading(false);
      } catch (err) {
        console.warn('[CrearLista] Error al cargar lista', err);
        if (!cancelled) {
          setItems([createEmptyShoppingListItem()]);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [sharedListIdParam, router, switchToList]);

  const toggleItem = useCallback(
    (itemId: string) => {
      applyItems((current) =>
        current.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        )
      );
    },
    [applyItems]
  );

  const applyExpandedProducts = useCallback(
    (products: string[], replaceItemId: string | null) => {
      const snapshot = itemsRef.current;
      let head: ShoppingListItem[] = [];
      let tail: ShoppingListItem[] = [];

      if (replaceItemId) {
        const index = snapshot.findIndex((item) => item.id === replaceItemId);
        if (index >= 0) {
          head = snapshot.slice(0, index);
          tail = snapshot.slice(index + 1).filter((item) => item.text.trim());
        } else {
          head = snapshot.filter((item) => item.text.trim());
        }
      } else {
        head = snapshot.filter((item) => item.text.trim());
      }

      const inserted: ShoppingListItem[] = products.map((productText) => ({
        ...createEmptyShoppingListItem(),
        text: productText,
      }));
      const next = ensureTrailingEmptyRow([...head, ...inserted, ...tail]);

      inputRefs.current.clear();
      setFocusedItemId(null);
      setItems(next);
      void persistActiveList(next);
      const remoteId = sharedListIdRef.current;
      if (remoteId) {
        scheduleRemoteSync(remoteId, next);
      }
      setLists((current) =>
        current.map((list) =>
          list.id === activeListIdRef.current
            ? { ...list, items: next, updatedAt: new Date().toISOString() }
            : list
        )
      );
      setBulkImporting(false);
      bulkLockRef.current = false;
      pendingBulkRef.current = null;
    },
    [persistActiveList, scheduleRemoteSync]
  );

  const scheduleBulkImport = useCallback(
    (products: string[], replaceItemId: string | null) => {
      if (bulkLockRef.current) return;
      bulkLockRef.current = true;
      pendingBulkRef.current = { itemId: replaceItemId, products };

      // Solo dismiss acá. NO desmontar TextInput dentro de onChangeText (crash Android).
      Keyboard.dismiss();

      // 1) Salir del evento nativo. 2) Quitar foco / desmontar lista. 3) Aplicar filas.
      setTimeout(() => {
        setFocusedItemId(null);
        inputRefs.current.clear();
        setBulkImporting(true);

        setTimeout(() => {
          const pending = pendingBulkRef.current;
          if (!pending) {
            setBulkImporting(false);
            bulkLockRef.current = false;
            return;
          }
          applyExpandedProducts(pending.products, pending.itemId);
        }, 250);
      }, 250);
    },
    [applyExpandedProducts]
  );

  const updateItemText = useCallback(
    (itemId: string, text: string) => {
      const bulk = parseBulkProductInput(text);

      if (!bulk) {
        applyItems((current) =>
          current.map((item) => (item.id === itemId ? { ...item, text } : item))
        );
        return;
      }

      // No setState con N filas acá: Android cierra la app.
      // Solo agenda el import con la lista desmontada.
      scheduleBulkImport(bulk, itemId);
    },
    [applyItems, scheduleBulkImport]
  );

  const applyBulkPaste = useCallback(() => {
    const products = parseBulkListText(pasteText);
    if (products.length === 0) {
      Alert.alert('Nada para pegar', 'Escribí o pegá productos separados por coma o renglón.');
      return;
    }

    setPasteVisible(false);
    setPasteText('');
    setPasteImporting(false);
    scheduleBulkImport(products, null);
  }, [pasteText, scheduleBulkImport]);

  const addRow = useCallback(() => {
    const newItem = createEmptyShoppingListItem();
    applyItems((current) => [...current, newItem]);
    focusRow(newItem.id, itemsRef.current.length);
  }, [applyItems, focusRow]);

  const removeRow = useCallback(
    (itemId: string) => {
      if (focusedItemId === itemId) setFocusedItemId(null);
      inputRefs.current.delete(itemId);
      applyItems((current) => current.filter((item) => item.id !== itemId));
    },
    [applyItems, focusedItemId]
  );

  const handleDeleteList = useCallback(() => {
    const title = listTitleRef.current;
    Alert.alert(
      'Eliminar lista',
      sharedListId
        ? `Se borrará “${title}” y el enlace compartido dejará de funcionar.`
        : `Se borrará la pestaña “${title}” y todos sus productos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            void (async () => {
              const listId = activeListIdRef.current;
              const result = await deleteLocalShoppingList(listId);
              setLists(result.lists);
              const next =
                result.lists.find((list) => list.id === result.activeId) ?? result.lists[0];
              if (next) switchToList(next);
              inputRefs.current.clear();
              if (sharedListIdParam) {
                router.replace('/crear-lista');
              }
            })().finally(() => setDeleting(false));
          },
        },
      ]
    );
  }, [sharedListId, sharedListIdParam, router, switchToList]);

  const confirmNewTab = useCallback(async () => {
    const created = await createLocalShoppingList(newTabTitle.trim() || undefined);
    const registry = await loadLocalShoppingLists();
    setLists(registry.lists);
    const active = registry.lists.find((list) => list.id === created.id) ?? created;
    switchToList(active);
    setNewTabVisible(false);
    setNewTabTitle('');
    inputRefs.current.clear();
  }, [newTabTitle, switchToList]);

  const confirmRename = useCallback(async () => {
    const listId = activeListIdRef.current;
    const nextTitle = renameTitle.trim() || 'Mi lista';
    await renameLocalShoppingList(listId, nextTitle);
    setListTitle(nextTitle);
    setLists((current) =>
      current.map((list) => (list.id === listId ? { ...list, title: nextTitle } : list))
    );
    if (sharedListId) {
      void syncSharedShoppingList(sharedListId, itemsRef.current, nextTitle);
    }
    setRenameVisible(false);
  }, [renameTitle, sharedListId]);

  const handleShare = useCallback(async () => {
    const filled = itemsRef.current.filter((item) => item.text.trim());
    if (filled.length === 0) {
      Alert.alert('Lista vacía', 'Agregá al menos un producto antes de compartir.');
      return;
    }

    setSharing(true);
    const remoteId = await saveSharedShoppingList(filled, sharedListId, listTitleRef.current);
    setSharing(false);

    if (!remoteId) {
      Alert.alert('Error', 'No se pudo guardar la lista. Revisá tu conexión.');
      return;
    }

    setSharedListId(remoteId);
    const withTrailing = ensureTrailingEmptyRow(filled);
    setItems(withTrailing);
    await updateLocalShoppingListItems(activeListIdRef.current, withTrailing, {
      sharedId: remoteId,
    });
    setLists((current) =>
      current.map((list) =>
        list.id === activeListIdRef.current ? { ...list, sharedId: remoteId, items: withTrailing } : list
      )
    );

    try {
      await Share.share({
        title: `${listTitleRef.current} — Lista Fácil`,
        message: buildSharedShoppingListShareMessage(remoteId, listTitleRef.current),
      });
    } catch {
      // Usuario canceló compartir.
    }
  }, [sharedListId]);

  const rowHeight = c.rowMinHeight + StyleSheet.hairlineWidth;

  const renderItem = useCallback(
    ({ item, index }: { item: ShoppingListItem; index: number }) => {
      const isEditing = focusedItemId === item.id;
      const placeholder =
        index === 0 ? 'Escribí o pegá productos…' : 'Siguiente producto…';
      const isTrailingEmpty = !item.text.trim() && index === items.length - 1;
      const canRemove = !isTrailingEmpty;

      return (
        <View style={styles.row}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.checked }}
            accessibilityLabel={item.checked ? 'Marcar pendiente' : 'Marcar listo'}
            onPress={withClickSound(() => toggleItem(item.id))}
            style={styles.checkBtn}
          >
            <Ionicons
              name={item.checked ? 'checkbox' : 'square-outline'}
              size={Math.round(c.qtySymbolSize * 1.4)}
              color={item.checked ? theme.primary : lc.textMuted}
            />
          </Pressable>

          {isEditing ? (
            <TextInput
              ref={(ref) => {
                if (ref) inputRefs.current.set(item.id, ref);
                else inputRefs.current.delete(item.id);
              }}
              value={item.text}
              onChangeText={(text) => updateItemText(item.id, text)}
              onFocus={() => scrollRowIntoView(index)}
              onBlur={() => {
                if (focusedItemId === item.id) setFocusedItemId(null);
              }}
              onSubmitEditing={() => focusNextRow(item.id)}
              placeholder={placeholder}
              placeholderTextColor={lc.textSecondary}
              style={[styles.input, item.checked && styles.inputChecked]}
              returnKeyType="next"
              blurOnSubmit={false}
              submitBehavior="submit"
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.text.trim() || placeholder}
              onPress={withClickSound(() => focusRow(item.id, index))}
              style={styles.rowTextBtn}
            >
              <Text
                style={[
                  styles.rowText,
                  item.checked && styles.inputChecked,
                  !item.text.trim() && styles.rowTextPlaceholder,
                ]}
                numberOfLines={1}
              >
                {item.text.trim() || placeholder}
              </Text>
            </Pressable>
          )}

          {canRemove ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Eliminar ${item.text.trim() || 'fila'}`}
              onPress={withClickSound(() => removeRow(item.id))}
              style={({ pressed }) => [styles.removeBtn, pressed && { opacity: 0.7 }]}
              hitSlop={6}
            >
              <Ionicons
                name="remove-circle-outline"
                size={Math.round(c.qtySymbolSize * 1.25)}
                color={theme.danger ?? '#C1121F'}
              />
            </Pressable>
          ) : (
            <View style={styles.removeBtnPlaceholder} />
          )}
        </View>
      );
    },
    [
      c.qtySymbolSize,
      focusedItemId,
      items.length,
      removeRow,
      styles,
      theme.danger,
      theme.primary,
      toggleItem,
      updateItemText,
      focusNextRow,
      focusRow,
      scrollRowIntoView,
    ]
  );

  if (loading) {
    return (
      <View style={styles.loadingBox}>
        <StatusBar barStyle="dark-content" backgroundColor={c.listBackground} />
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={theme.primary} />

      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Volver"
            style={styles.backBtn}
            hitSlop={10}
          >
            <Ionicons name="arrow-back" size={22} color={theme.textOnPrimary} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Renombrar lista"
            onPress={withClickSound(() => {
              setRenameTitle(listTitle);
              setRenameVisible(true);
            })}
            style={styles.headerTitleBlock}
          >
            <Text style={styles.headerTitle} numberOfLines={1}>
              {listTitle}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartir lista"
            onPress={withClickSound(() => void handleShare())}
            disabled={sharing}
            style={({ pressed }) => [styles.shareBtn, (pressed || sharing) && { opacity: 0.85 }]}
          >
            {sharing ? (
              <ActivityIndicator size="small" color={theme.textOnPrimary} />
            ) : (
              <>
                <Ionicons name="share-social-outline" size={14} color={theme.textOnPrimary} />
                <Text style={styles.shareBtnText}>Compartir</Text>
              </>
            )}
          </Pressable>
        </View>

      </View>

      <View style={styles.chromeTabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {lists.map((list) => {
            const active = list.id === activeListId;
            return (
              <Pressable
                key={list.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Lista ${list.title}`}
                onPress={withClickSound(() => {
                  if (list.id === activeListId) {
                    setRenameTitle(list.title);
                    setRenameVisible(true);
                    return;
                  }
                  switchToList(list);
                  inputRefs.current.clear();
                })}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text
                  style={[styles.tabText, active && styles.tabTextActive]}
                  numberOfLines={1}
                >
                  {list.title || 'Sin título'}
                </Text>
              </Pressable>
            );
          })}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nueva lista"
            onPress={withClickSound(() => {
              setNewTabTitle('');
              setNewTabVisible(true);
            })}
            style={({ pressed }) => [styles.tabPlus, pressed && { opacity: 0.75 }]}
            hitSlop={8}
          >
            <Ionicons name="add" size={22} color="#3C4043" />
          </Pressable>
        </ScrollView>
      </View>

      <CartAccessibilityBar />

      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pegar lista de productos"
          onPress={withClickSound(() => {
            Keyboard.dismiss();
            setPasteText('');
            setPasteVisible(true);
          })}
          style={({ pressed }) => [
            styles.toolbarBtn,
            { borderColor: theme.primary },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="clipboard-outline" size={c.clearIconSize} color={theme.primary} />
          <Text style={[styles.toolbarBtnText, { color: theme.primary }]}>Pegar lista</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Eliminar lista"
          onPress={withTeclaSound(handleDeleteList)}
          disabled={deleting}
          style={({ pressed }) => [
            styles.toolbarBtn,
            { borderColor: lc.border },
            pressed && !deleting && { opacity: 0.85 },
            deleting && { opacity: 0.6 },
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={theme.danger ?? '#C1121F'} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={c.clearIconSize} color={theme.danger ?? '#C1121F'} />
              <Text style={styles.deleteBtnText}>Eliminar lista</Text>
            </>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}
      >
        <View style={styles.tableHeader}>
          <View style={styles.tableHeaderCheck} />
          <Text style={styles.tableHeaderText}>Producto</Text>
          <View style={styles.tableHeaderRemove} />
        </View>

        {bulkImporting ? (
          <View style={styles.bulkImportBox}>
            <ActivityIndicator color={theme.primary} />
            <Text style={styles.bulkImportText}>Importando productos…</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            updateCellsBatchingPeriod={50}
            windowSize={5}
            removeClippedSubviews={false}
            getItemLayout={(_, index) => ({
              length: rowHeight,
              offset: rowHeight * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                listRef.current?.scrollToOffset({
                  offset: Math.max(0, info.averageItemLength * info.index),
                  animated: true,
                });
              }, 100);
            }}
            ListFooterComponent={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Agregar producto"
                onPress={withClickSound(addRow)}
                style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.88 }]}
              >
                <Ionicons name="add-circle-outline" size={c.sortIconSize} color={theme.primary} />
                <Text style={styles.addBtnText}>Agregar producto</Text>
              </Pressable>
            }
          />
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={pasteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!pasteImporting) setPasteVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pegar lista</Text>
            <Text style={styles.modalHint}>
              Pegá acá todos los productos (uno por renglón o separados por coma) y tocá Importar.
            </Text>
            <TextInput
              value={pasteText}
              onChangeText={setPasteText}
              placeholder={'arroz\nfideos\naceite\n…'}
              placeholderTextColor={lc.textSecondary}
              style={styles.pasteArea}
              multiline
              textAlignVertical="top"
              autoFocus
              editable={!pasteImporting}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={withClickSound(() => {
                  if (pasteImporting) return;
                  setPasteVisible(false);
                  setPasteText('');
                })}
                style={styles.modalBtn}
                disabled={pasteImporting}
              >
                <Text style={[styles.modalBtnText, { color: lc.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={withClickSound(applyBulkPaste)}
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
                disabled={pasteImporting}
              >
                {pasteImporting ? (
                  <ActivityIndicator size="small" color={theme.textOnPrimary} />
                ) : (
                  <Text style={[styles.modalBtnText, { color: theme.textOnPrimary }]}>
                    Importar
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={newTabVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNewTabVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nueva lista</Text>
            <Text style={styles.modalHint}>Como una pestaña nueva: dale un título.</Text>
            <TextInput
              value={newTabTitle}
              onChangeText={setNewTabTitle}
              placeholder="Ej. Cumpleaños, Asado…"
              placeholderTextColor={lc.textSecondary}
              style={styles.modalInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void confirmNewTab()}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={withClickSound(() => setNewTabVisible(false))}
                style={styles.modalBtn}
              >
                <Text style={[styles.modalBtnText, { color: lc.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={withClickSound(() => void confirmNewTab())}
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textOnPrimary }]}>Crear</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={renameVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Título de la lista</Text>
            <TextInput
              value={renameTitle}
              onChangeText={setRenameTitle}
              placeholder="Nombre de la lista"
              placeholderTextColor={lc.textSecondary}
              style={styles.modalInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void confirmRename()}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={withClickSound(() => setRenameVisible(false))}
                style={styles.modalBtn}
              >
                <Text style={[styles.modalBtnText, { color: lc.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={withClickSound(() => void confirmRename())}
                style={[styles.modalBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.modalBtnText, { color: theme.textOnPrimary }]}>Guardar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

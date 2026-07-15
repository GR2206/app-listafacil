import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  Share,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Keyboard,
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
  clearDraftShoppingList,
  createEmptyShoppingListItem,
  deleteSharedShoppingList,
  loadDraftShoppingList,
  loadSharedShoppingList,
  saveDraftShoppingList,
  saveSharedShoppingList,
  syncSharedShoppingList,
} from '@/services/sharedShoppingList';
import { cartListColors as lc } from '@/theme/cartCompact';
import { radii } from '@/theme';
import type { ShoppingListItem } from '@/types/shoppingList';
import { withClickSound } from '@/utils/withClickSound';
import { withTeclaSound } from '@/utils/withTeclaSound';

const SYNC_DEBOUNCE_MS = 900;
const KEYBOARD_EXTRA_GAP = 28;

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

export default function CrearListaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();

  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const sharedListIdParam = Array.isArray(params.id) ? params.id[0] : params.id;

  const [items, setItems] = useState<ShoppingListItem[]>([createEmptyShoppingListItem()]);
  const [sharedListId, setSharedListId] = useState<string | null>(sharedListIdParam?.trim() || null);
  const [loading, setLoading] = useState(Boolean(sharedListIdParam));
  const [sharing, setSharing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemsRef = useRef(items);
  const inputRefs = useRef<Map<string, TextInput>>(new Map());
  const listRef = useRef<FlatList<ShoppingListItem>>(null);

  itemsRef.current = items;

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
          paddingBottom: 10,
          borderBottomWidth: 3,
          borderBottomColor: theme.gridBorder ?? 'rgba(255,255,255,0.2)',
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
          justifyContent: 'flex-end',
          paddingHorizontal: c.margin,
          paddingVertical: c.gap,
          backgroundColor: lc.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: lc.border,
        },
        deleteBtn: {
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
        deleteBtnText: {
          fontSize: c.clearFontSize,
          fontWeight: '700',
          color: theme.danger ?? '#C1121F',
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
        listContent: {
          paddingBottom:
            Math.max(insets.bottom, 16) +
            24 +
            (keyboardHeight > 0
              ? Platform.OS === 'android'
                ? keyboardHeight + KEYBOARD_EXTRA_GAP
                : KEYBOARD_EXTRA_GAP + 56
              : 0),
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
      }),
    [c, insets.top, insets.bottom, theme, keyboardHeight]
  );

  const persistDraft = useCallback(async (nextItems: ShoppingListItem[]) => {
    if (sharedListId) return;
    await saveDraftShoppingList(nextItems);
  }, [sharedListId]);

  const scheduleRemoteSync = useCallback((listId: string, nextItems: ShoppingListItem[]) => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncSharedShoppingList(listId, nextItems);
    }, SYNC_DEBOUNCE_MS);
  }, []);

  const applyItems = useCallback(
    (updater: (current: ShoppingListItem[]) => ShoppingListItem[]) => {
      setItems((current) => {
        const updated = ensureTrailingEmptyRow(updater(current));
        void persistDraft(updated);
        if (sharedListId) {
          scheduleRemoteSync(sharedListId, updated);
        }
        return updated;
      });
    },
    [persistDraft, scheduleRemoteSync, sharedListId]
  );

  const focusRow = useCallback((itemId: string, listIndex?: number) => {
    setTimeout(() => {
      inputRefs.current.get(itemId)?.focus();
      if (listIndex != null && listIndex >= 0) {
        try {
          listRef.current?.scrollToIndex({
            index: listIndex,
            animated: true,
            viewPosition: 0.35,
          });
        } catch {
          // scrollToIndex puede fallar si el ítem aún no midió
        }
      }
    }, 80);
  }, []);

  /** Solo scrollea — no volver a focus() (evita loop nativo en Android). */
  const scrollRowIntoView = useCallback((listIndex: number) => {
    if (listIndex < 0) return;
    setTimeout(() => {
      try {
        listRef.current?.scrollToIndex({
          index: listIndex,
          animated: true,
          viewPosition: 0.35,
        });
      } catch {
        // ignore
      }
    }, 50);
  }, []);

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
        if (sharedListIdParam?.trim()) {
          setLoading(true);
          const remote = await loadSharedShoppingList(sharedListIdParam.trim());
          if (cancelled) return;

          if (!remote) {
            Alert.alert(
              'Lista no encontrada',
              'No encontramos esta lista. Puede haber expirado o el enlace está incompleto.'
            );
            const draft = await loadDraftShoppingList();
            setItems(ensureTrailingEmptyRow(Array.isArray(draft) ? draft : []));
            setSharedListId(null);
            router.replace('/crear-lista');
          } else {
            setItems(ensureTrailingEmptyRow(remote.items ?? []));
            setSharedListId(remote.id);
          }
          setLoading(false);
          return;
        }

        const draft = await loadDraftShoppingList();
        if (!cancelled) {
          setItems(ensureTrailingEmptyRow(Array.isArray(draft) ? draft : []));
          setLoading(false);
        }
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
  }, [sharedListIdParam, router]);

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

  const updateItemText = useCallback(
    (itemId: string, text: string) => {
      const bulk = parseBulkProductInput(text);

      if (!bulk) {
        applyItems((current) =>
          current.map((item) => (item.id === itemId ? { ...item, text } : item))
        );
        return;
      }

      // Pegado masivo: cerrar teclado y NO re-focus (evita crash nativo en Android).
      Keyboard.dismiss();
      inputRefs.current.get(itemId)?.blur();

      applyItems((current) => {
        const index = current.findIndex((item) => item.id === itemId);
        if (index < 0) return current;

        const head = current.slice(0, index);
        const tail = current.slice(index + 1).filter((item) => item.text.trim());
        const existing = current[index];

        const inserted: ShoppingListItem[] = bulk.map((productText, i) =>
          i === 0
            ? { ...existing, text: productText }
            : { ...createEmptyShoppingListItem(), text: productText }
        );

        return ensureTrailingEmptyRow([...head, ...inserted, ...tail]);
      });

      // Esperar a que FlatList monte las filas antes de scrollear.
      setTimeout(() => {
        try {
          listRef.current?.scrollToEnd({ animated: true });
        } catch {
          // ignore
        }
      }, 350);
    },
    [applyItems]
  );

  const addRow = useCallback(() => {
    const newItem = createEmptyShoppingListItem();
    applyItems((current) => [...current, newItem]);
    focusRow(newItem.id, itemsRef.current.length);
  }, [applyItems, focusRow]);

  const resetList = useCallback(async () => {
    if (sharedListId) {
      await deleteSharedShoppingList(sharedListId);
    }
    await clearDraftShoppingList();
    setSharedListId(null);
    setItems([createEmptyShoppingListItem()]);
    inputRefs.current.clear();
    if (sharedListIdParam) {
      router.replace('/crear-lista');
    }
  }, [sharedListId, sharedListIdParam, router]);

  const handleDeleteList = useCallback(() => {
    Alert.alert(
      'Eliminar lista',
      sharedListId
        ? 'Se borrarán todos los productos y el enlace compartido dejará de funcionar.'
        : 'Se borrarán todos los productos de esta lista.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            setDeleting(true);
            void resetList().finally(() => setDeleting(false));
          },
        },
      ]
    );
  }, [resetList, sharedListId]);

  const handleShare = useCallback(async () => {
    const filled = itemsRef.current.filter((item) => item.text.trim());
    if (filled.length === 0) {
      Alert.alert('Lista vacía', 'Agregá al menos un producto antes de compartir.');
      return;
    }

    setSharing(true);
    const listId = await saveSharedShoppingList(filled, sharedListId);
    setSharing(false);

    if (!listId) {
      Alert.alert('Error', 'No se pudo guardar la lista. Revisá tu conexión.');
      return;
    }

    setSharedListId(listId);
    setItems(ensureTrailingEmptyRow(filled));

    try {
      await Share.share({
        title: 'Lista de compras — Lista Fácil',
        message: buildSharedShoppingListShareMessage(listId),
      });
    } catch {
      // Usuario canceló compartir.
    }
  }, [sharedListId]);

  const renderItem = useCallback(
    ({ item, index }: { item: ShoppingListItem; index: number }) => (
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

        <TextInput
          ref={(ref) => {
            if (ref) inputRefs.current.set(item.id, ref);
            else inputRefs.current.delete(item.id);
          }}
          value={item.text}
          onChangeText={(text) => updateItemText(item.id, text)}
          onFocus={() => scrollRowIntoView(index)}
          onSubmitEditing={() => focusNextRow(item.id)}
          placeholder={index === 0 ? 'Escribí un producto…' : 'Siguiente producto…'}
          placeholderTextColor={lc.textSecondary}
          style={[styles.input, item.checked && styles.inputChecked]}
          returnKeyType="next"
          blurOnSubmit={false}
          submitBehavior="submit"
        />
      </View>
    ),
    [
      c.qtySymbolSize,
      styles,
      theme.primary,
      toggleItem,
      updateItemText,
      focusNextRow,
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

          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Lista de compras
            </Text>
          </View>

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

      <CartAccessibilityBar />

      <View style={styles.toolbar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Eliminar lista"
          onPress={withTeclaSound(handleDeleteList)}
          disabled={deleting}
          style={({ pressed }) => [
            styles.deleteBtn,
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
        </View>

        <FlatList
          ref={listRef}
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={16}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews={Platform.OS === 'android'}
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
      </KeyboardAvoidingView>
    </View>
  );
}

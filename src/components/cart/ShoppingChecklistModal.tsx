import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';
import {
  createEmptyShoppingListItem,
  loadLocalShoppingLists,
  setActiveShoppingListId,
  updateLocalShoppingListItems,
} from '@/services/sharedShoppingList';
import { radii } from '@/theme';
import type { LocalShoppingList, ShoppingListItem } from '@/types/shoppingList';
import { withClickSound } from '@/utils/withClickSound';
import { withTeclaSound } from '@/utils/withTeclaSound';

interface ShoppingChecklistModalProps {
  visible: boolean;
  onClose: () => void;
}

const SHEET_OFFSCREEN = 520;

export function ShoppingChecklistModal({ visible, onClose }: ShoppingChecklistModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();

  const [lists, setLists] = useState<LocalShoppingList[]>([]);
  const [activeListId, setActiveListId] = useState('');
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const mountedRef = useRef(false);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(SHEET_OFFSCREEN)).current;

  const activeList = useMemo(
    () => lists.find((list) => list.id === activeListId) ?? lists[0],
    [lists, activeListId]
  );

  const filled = useMemo(() => items.filter((item) => item.text.trim()), [items]);
  const pending = useMemo(() => filled.filter((item) => !item.checked), [filled]);
  const done = useMemo(() => filled.filter((item) => item.checked), [filled]);

  const showList = useCallback((list: LocalShoppingList) => {
    setActiveListId(list.id);
    const next = list.items.filter((item) => item.text.trim());
    setItems(next);
    void setActiveShoppingListId(list.id);
  }, []);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const registry = await loadLocalShoppingLists();
      if (cancelled) return;
      setLists(registry.lists);
      const active =
        registry.lists.find((list) => list.id === registry.activeId) ?? registry.lists[0];
      if (active) showList(active);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, showList]);

  useEffect(() => {
    if (visible) {
      mountedRef.current = true;
      setMounted(true);
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(SHEET_OFFSCREEN);
      const openAnim = Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          damping: 20,
          stiffness: 210,
          mass: 0.9,
          useNativeDriver: true,
        }),
      ]);
      openAnim.start();
      return () => openAnim.stop();
    }

    if (!mountedRef.current) return;

    const closeAnim = Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: SHEET_OFFSCREEN,
        duration: 260,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    closeAnim.start(({ finished }) => {
      if (finished) {
        mountedRef.current = false;
        setMounted(false);
      }
    });
    return () => closeAnim.stop();
  }, [visible, backdropOpacity, sheetTranslateY]);

  const persist = useCallback(
    async (next: ShoppingListItem[]) => {
      const listId = activeListId;
      if (!listId) return;
      const toSave =
        next.length > 0
          ? [...next, createEmptyShoppingListItem()]
          : [createEmptyShoppingListItem()];
      await updateLocalShoppingListItems(listId, toSave);
      setLists((current) =>
        current.map((list) =>
          list.id === listId
            ? { ...list, items: toSave, updatedAt: new Date().toISOString() }
            : list
        )
      );
    },
    [activeListId]
  );

  const toggleItem = useCallback(
    (itemId: string) => {
      setItems((current) => {
        const next = current.map((item) =>
          item.id === itemId ? { ...item, checked: !item.checked } : item
        );
        void persist(next);
        return next;
      });
    },
    [persist]
  );

  const openFullEditor = useCallback(() => {
    onClose();
    router.push('/crear-lista');
  }, [onClose, router]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        backdropFill: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.5)',
        },
        sheet: {
          maxHeight: '78%',
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: '#2E2E32',
          backgroundColor: '#121214',
          paddingBottom: Math.max(insets.bottom, 12),
          overflow: 'hidden',
        },
        grab: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#3A3A3C',
          marginTop: 10,
          marginBottom: 6,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: c.margin,
          paddingBottom: 8,
        },
        titleBlock: {
          flex: 1,
          minWidth: 0,
        },
        title: {
          fontSize: Math.round(17 * (c.nameFontSize / 13)),
          fontWeight: '800',
          color: '#FFFFFF',
        },
        subtitle: {
          fontSize: c.clearFontSize,
          fontWeight: '600',
          marginTop: 2,
          color: 'rgba(255,255,255,0.72)',
        },
        closeBtn: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        chromeTabBar: {
          backgroundColor: '#1C1C1F',
          flexDirection: 'row',
          alignItems: 'flex-end',
          paddingTop: 6,
          paddingHorizontal: 8,
          minHeight: 40,
        },
        tabScroll: {
          flexGrow: 1,
        },
        tabContent: {
          alignItems: 'flex-end',
          flexDirection: 'row',
          gap: 0,
        },
        tab: {
          maxWidth: 160,
          minWidth: 72,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginRight: 2,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          backgroundColor: '#2A2A2E',
        },
        tabActive: {
          backgroundColor: '#121214',
        },
        tabText: {
          fontSize: Math.max(12, c.clearFontSize - 1),
          fontWeight: '600',
          color: 'rgba(255,255,255,0.75)',
        },
        tabTextActive: {
          fontWeight: '800',
          color: '#FFFFFF',
        },
        list: {
          paddingHorizontal: c.margin,
          paddingBottom: 8,
          backgroundColor: '#121214',
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: c.rowMinHeight,
          paddingVertical: c.rowPaddingV,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: '#2E2E32',
          backgroundColor: '#121214',
        },
        rowText: {
          flex: 1,
          fontSize: c.nameFontSize,
          fontWeight: '600',
          color: '#FFFFFF',
        },
        rowTextDone: {
          textDecorationLine: 'line-through',
          color: 'rgba(255,255,255,0.45)',
        },
        empty: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 36,
          paddingHorizontal: c.margin,
          gap: 8,
          backgroundColor: '#121214',
        },
        emptyTitle: {
          fontSize: c.nameFontSize,
          fontWeight: '800',
          textAlign: 'center',
          color: '#FFFFFF',
        },
        emptyHint: {
          fontSize: c.clearFontSize,
          textAlign: 'center',
          lineHeight: 18,
          color: 'rgba(255,255,255,0.7)',
        },
        footer: {
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: c.margin,
          paddingTop: 10,
          backgroundColor: '#121214',
        },
        footerBtn: {
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingVertical: 12,
          borderRadius: radii.md,
          borderWidth: 1,
        },
        footerBtnText: {
          fontSize: c.sortChipFontSize,
          fontWeight: '800',
        },
        loadingBox: {
          paddingVertical: 40,
          alignItems: 'center',
          backgroundColor: '#121214',
        },
      }),
    [c, insets.bottom]
  );

  const listTitle = activeList?.title?.trim() || 'Mi lista';

  if (!mounted) return null;

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdropFill, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={withClickSound(onClose)} />
        </Animated.View>

        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}>
          <View style={styles.grab} />

          <View style={styles.header}>
            <Ionicons name="checkbox-outline" size={22} color={theme.primary} />
            <View style={styles.titleBlock}>
              <Text style={styles.title} numberOfLines={1}>
                {listTitle}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {filled.length === 0
                  ? 'Sin productos en esta lista'
                  : `${pending.length} pendientes · ${done.length} listos`}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              onPress={withClickSound(onClose)}
              style={styles.closeBtn}
              hitSlop={10}
            >
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.75)" />
            </Pressable>
          </View>

          {lists.length > 0 ? (
            <View style={styles.chromeTabBar}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabScroll}
                contentContainerStyle={styles.tabContent}
                keyboardShouldPersistTaps="handled"
              >
                {lists.map((list) => {
                  const selected = list.id === activeListId;
                  const label = list.title?.trim() || 'Sin título';
                  return (
                    <Pressable
                      key={list.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Usar lista ${label}`}
                      onPress={withClickSound(() => showList(list))}
                      style={[styles.tab, selected && styles.tabActive]}
                    >
                      <Text
                        style={[styles.tabText, selected && styles.tabTextActive]}
                        numberOfLines={1}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : filled.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={36} color="rgba(255,255,255,0.5)" />
              <Text style={styles.emptyTitle}>Lista vacía</Text>
              <Text style={styles.emptyHint}>
                Armá tu lista en Crear Lista compras (podés tener varias con título) y volvé acá
                para ir tachando mientras escaneás.
              </Text>
            </View>
          ) : (
            <FlatList
              data={[...pending, ...done]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                  accessibilityLabel={item.checked ? `Desmarcar ${item.text}` : `Tachar ${item.text}`}
                  onPress={withTeclaSound(() => toggleItem(item.id))}
                  style={styles.row}
                >
                  <Ionicons
                    name={item.checked ? 'checkbox' : 'square-outline'}
                    size={Math.round(c.qtySymbolSize * 1.45)}
                    color={item.checked ? theme.primary : 'rgba(255,255,255,0.55)'}
                  />
                  <Text
                    style={[styles.rowText, item.checked && styles.rowTextDone]}
                    numberOfLines={2}
                  >
                    {item.text}
                  </Text>
                </Pressable>
              )}
            />
          )}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Editar lista completa"
              onPress={withClickSound(openFullEditor)}
              style={({ pressed }) => [
                styles.footerBtn,
                {
                  borderColor: '#3A3A3C',
                  backgroundColor: '#1C1C1F',
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={[styles.footerBtnText, { color: '#FFFFFF' }]}>Editar lista</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Seguir comprando"
              onPress={withClickSound(onClose)}
              style={({ pressed }) => [
                styles.footerBtn,
                {
                  borderColor: theme.primary,
                  backgroundColor: theme.primary,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <Ionicons name="scan-outline" size={16} color={theme.textOnPrimary} />
              <Text style={[styles.footerBtnText, { color: theme.textOnPrimary }]}>
                Seguir
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

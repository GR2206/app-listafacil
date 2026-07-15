import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';
import {
  createEmptyShoppingListItem,
  loadDraftShoppingList,
  saveDraftShoppingList,
} from '@/services/sharedShoppingList';
import { cartListColors as lc } from '@/theme/cartCompact';
import { radii } from '@/theme';
import type { ShoppingListItem } from '@/types/shoppingList';
import { withClickSound } from '@/utils/withClickSound';
import { withTeclaSound } from '@/utils/withTeclaSound';

interface ShoppingChecklistModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ShoppingChecklistModal({ visible, onClose }: ShoppingChecklistModalProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();

  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(false);

  const filled = useMemo(() => items.filter((item) => item.text.trim()), [items]);
  const pending = useMemo(() => filled.filter((item) => !item.checked), [filled]);
  const done = useMemo(() => filled.filter((item) => item.checked), [filled]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const draft = await loadDraftShoppingList();
      if (cancelled) return;
      const next = draft.filter((item) => item.text.trim());
      setItems(next.length > 0 ? next : []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const persist = useCallback(async (next: ShoppingListItem[]) => {
    const toSave =
      next.length > 0
        ? [...next, createEmptyShoppingListItem()]
        : [createEmptyShoppingListItem()];
    await saveDraftShoppingList(toSave);
  }, []);

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
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        },
        sheet: {
          maxHeight: '78%',
          borderTopLeftRadius: radii.lg,
          borderTopRightRadius: radii.lg,
          borderWidth: StyleSheet.hairlineWidth,
          paddingBottom: Math.max(insets.bottom, 12),
          overflow: 'hidden',
        },
        grab: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: lc.border,
          marginTop: 10,
          marginBottom: 6,
        },
        header: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: c.margin,
          paddingBottom: 10,
        },
        titleBlock: {
          flex: 1,
          minWidth: 0,
        },
        title: {
          fontSize: Math.round(17 * (c.nameFontSize / 13)),
          fontWeight: '800',
        },
        subtitle: {
          fontSize: c.clearFontSize,
          fontWeight: '600',
          marginTop: 2,
        },
        closeBtn: {
          width: 36,
          height: 36,
          alignItems: 'center',
          justifyContent: 'center',
        },
        list: {
          paddingHorizontal: c.margin,
          paddingBottom: 8,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minHeight: c.rowMinHeight,
          paddingVertical: c.rowPaddingV,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: lc.border,
        },
        rowText: {
          flex: 1,
          fontSize: c.nameFontSize,
          fontWeight: '600',
        },
        rowTextDone: {
          textDecorationLine: 'line-through',
          color: lc.textSecondary,
        },
        empty: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 36,
          paddingHorizontal: c.margin,
          gap: 8,
        },
        emptyTitle: {
          fontSize: c.nameFontSize,
          fontWeight: '800',
          textAlign: 'center',
        },
        emptyHint: {
          fontSize: c.clearFontSize,
          textAlign: 'center',
          lineHeight: 18,
        },
        footer: {
          flexDirection: 'row',
          gap: 8,
          paddingHorizontal: c.margin,
          paddingTop: 10,
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
        },
      }),
    [c, insets.bottom]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={withClickSound(onClose)} />

        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.grab} />

          <View style={styles.header}>
            <Ionicons name="checkbox-outline" size={22} color={theme.primary} />
            <View style={styles.titleBlock}>
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                Tachá lo que llevás
              </Text>
              <Text style={[styles.subtitle, { color: theme.textMuted }]} numberOfLines={1}>
                {filled.length === 0
                  ? 'Sin productos en tu lista'
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
              <Ionicons name="close" size={24} color={theme.textMuted} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : filled.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="list-outline" size={36} color={lc.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Lista vacía</Text>
              <Text style={[styles.emptyHint, { color: theme.textMuted }]}>
                Armá tu lista en Crear Lista compras y volvé acá para ir tachando mientras escaneás.
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
                    color={item.checked ? theme.primary : lc.textMuted}
                  />
                  <Text
                    style={[
                      styles.rowText,
                      { color: theme.text },
                      item.checked && styles.rowTextDone,
                    ]}
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
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceElevated,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons name="create-outline" size={16} color={theme.text} />
              <Text style={[styles.footerBtnText, { color: theme.text }]}>Editar lista</Text>
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
        </View>
      </View>
    </Modal>
  );
}

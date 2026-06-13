import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';
import type { SortMode } from '@/utils/sortCartItems';
import { radii } from '@/theme';
import { cartListColors as lc } from '@/theme/cartCompact';
import { withTeclaSound } from '@/utils/withTeclaSound';

interface CartSortBarProps {
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onReset: () => void;
}

const SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'alpha', label: 'Orden A-Z' },
  { mode: 'price-desc', label: 'Precio: Mayor a Menor' },
  { mode: 'price-asc', label: 'Precio: Menor a Mayor' },
];

export function CartSortBar({ sortMode, onSortChange, onReset }: CartSortBarProps) {
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();
  const isCustomSort = sortMode !== 'chrono';
  const styles = useMemo(() => createStyles(c), [c]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {SORT_OPTIONS.map(({ mode, label }) => {
          const active = sortMode === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={withTeclaSound(() => onSortChange(mode))}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? theme.primary : lc.surface,
                  borderColor: active ? theme.primary : lc.border,
                },
                pressed && styles.chipPressed,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? theme.textOnPrimary : lc.text },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}

        {isCustomSort ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restablecer orden"
            onPress={withTeclaSound(onReset)}
            style={({ pressed }) => [
              styles.resetBtn,
              {
                backgroundColor: lc.surfaceElevated,
                borderColor: lc.border,
              },
              pressed && styles.chipPressed,
            ]}
          >
            <Ionicons name="refresh" size={c.sortIconSize} color={lc.text} />
            <Text style={[styles.resetText, { color: lc.text }]}>
              Restablecer Orden
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function createStyles(c: ReturnType<typeof import('@/theme/scaledCartMetrics').createScaledCartMetrics>) {
  return StyleSheet.create({
    wrapper: {
      paddingBottom: 2,
    },
    scroll: {
      paddingHorizontal: c.margin,
      gap: c.gap,
      alignItems: 'center',
      flexWrap: 'nowrap',
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      borderWidth: 1,
      minHeight: c.sortChipHeight,
      justifyContent: 'center',
      flexShrink: 0,
    },
    chipPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.98 }],
    },
    chipText: {
      fontSize: c.sortChipFontSize,
      fontWeight: '700',
    },
    resetBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      borderWidth: 1,
      minHeight: c.sortChipHeight,
      flexShrink: 0,
    },
    resetText: {
      fontSize: c.sortChipFontSize,
      fontWeight: '800',
    },
  });
}

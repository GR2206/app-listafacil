import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';
import { radii } from '@/theme';
import { cartListColors as lc } from '@/theme/cartCompact';
import { withTeclaTaskFeedback } from '@/utils/withTaskFeedback';

interface ShoppingChecklistButtonProps {
  onPress: () => void;
}

/** Acceso rápido a tachar productos de la lista de compras. */
export function ShoppingChecklistButton({ onPress }: ShoppingChecklistButtonProps) {
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir lista para tachar productos"
      onPress={withTeclaTaskFeedback(onPress, 'medium')}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: c.scanBarHeight,
          gap: c.gap,
          backgroundColor: lc.surfaceElevated,
          borderColor: lc.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="checkbox-outline" size={c.scanIconSize} color={theme.primary} />
      <Text style={[styles.label, { fontSize: c.scanFontSize, color: lc.text }]}>
        Mi lista
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 120,
    maxWidth: 196,
    borderRadius: radii.md,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

import { Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';
import { radii } from '@/theme';
import { hexToRgba } from '@/utils/hexToRgba';
import { withTeclaTaskFeedback } from '@/utils/withTaskFeedback';

interface CartScanButtonProps {
  onPress: () => void;
}

export function CartScanButton({ onPress }: CartScanButtonProps) {
  const { theme } = useSupermarketTheme();
  const { metrics: c } = useCartListScale();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Escanear producto"
      onPress={withTeclaTaskFeedback(onPress, 'medium')}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: c.scanBarHeight,
          gap: c.gap,
          backgroundColor: hexToRgba(theme.primary, pressed ? 0.92 : 0.82),
          borderColor: hexToRgba(theme.gridBorder, 0.65),
        },
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name="barcode-outline" size={c.scanIconSize} color={theme.textOnPrimary} />
      <Text style={[styles.label, { fontSize: c.scanFontSize, color: theme.textOnPrimary }]}>
        Escanear
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '46%',
    minWidth: 136,
    maxWidth: 196,
    borderRadius: radii.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 3,
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
});

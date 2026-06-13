import { Text, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { hexToRgba } from '@/utils/hexToRgba';
import { formatPriceDisplay } from '@/utils/formatPriceDisplay';
import { spacing, radii, typography } from '@/theme';

interface ScanSuccessToastProps {
  productName: string;
  price: number;
}

/** Toast breve sobre la zona inferior del escáner (encima del FAB "Ver mi lista"). */
export function ScanSuccessToast({ productName, price }: ScanSuccessToastProps) {
  const { theme } = useSupermarketTheme();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 16) + 72;

  return (
    <View
      style={[styles.wrap, { bottom }]}
      pointerEvents="none"
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: hexToRgba(theme.surface, 0.94),
            borderColor: hexToRgba(theme.primary, 0.55),
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: hexToRgba(theme.primary, 0.18) }]}>
          <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
        </View>

        <View style={styles.copy}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={[styles.price, { color: theme.primary }]}>
            {formatPriceDisplay(price)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 14,
    elevation: 14,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 8,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    fontSize: typography.body,
    fontWeight: '700',
  },
  price: {
    fontSize: typography.bodyLarge,
    fontWeight: '800',
  },
});

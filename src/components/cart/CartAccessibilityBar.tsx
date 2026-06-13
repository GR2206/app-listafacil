import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSupermarketTheme } from '@/context/ThemeContext';
import { useCartListScale } from '@/context/CartListScaleContext';
import { cartListColors as lc } from '@/theme/cartCompact';
import { withTeclaSound } from '@/utils/withTeclaSound';

const ACCESSIBILITY_BAR_SCALE = 1.2;

export function CartAccessibilityBar() {
  const { theme } = useSupermarketTheme();
  const { scale, metrics, canDecrease, canIncrease, decreaseScale, increaseScale } =
    useCartListScale();

  const pct = Math.round(scale * 100);
  const barScale = ACCESSIBILITY_BAR_SCALE;
  const labelSize = Math.round(Math.max(10, metrics.clearFontSize - 1) * barScale);
  const btnSize = Math.round(metrics.qtyBtnSize * barScale);
  const btnFontSize = Math.round(metrics.qtyFontSize * barScale);
  const pctFontSize = Math.round(metrics.clearFontSize * barScale);

  return (
    <View
      style={[
        styles.bar,
        {
          marginHorizontal: metrics.margin,
          paddingVertical: metrics.gap,
          gap: metrics.gap,
        },
      ]}
      accessibilityRole="toolbar"
      accessibilityLabel="Control de tamaño de texto de toda la aplicación"
    >
      <Text style={[styles.label, { fontSize: labelSize }]}>
        Tamaño
      </Text>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Reducir tamaño de la lista"
          accessibilityState={{ disabled: !canDecrease }}
          disabled={!canDecrease}
          onPress={withTeclaSound(decreaseScale)}
          style={({ pressed }) => [
            styles.btn,
            {
              borderColor: lc.border,
              backgroundColor: lc.surfaceElevated,
              minWidth: btnSize,
              minHeight: btnSize,
            },
            !canDecrease && styles.btnDisabled,
            pressed && canDecrease && styles.btnPressed,
          ]}
        >
          <Text style={[styles.btnText, { fontSize: btnFontSize, color: lc.text }]}>
            A-
          </Text>
        </Pressable>

        <Text style={[styles.pct, { fontSize: pctFontSize, color: lc.textMuted }]}>
          {pct}%
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Aumentar tamaño de la lista"
          accessibilityState={{ disabled: !canIncrease }}
          disabled={!canIncrease}
          onPress={withTeclaSound(increaseScale)}
          style={({ pressed }) => [
            styles.btn,
            {
              borderColor: theme.primary,
              backgroundColor: `${theme.primary}12`,
              minWidth: btnSize,
              minHeight: btnSize,
            },
            !canIncrease && styles.btnDisabled,
            pressed && canIncrease && styles.btnPressed,
          ]}
        >
          <Text style={[styles.btnText, { fontSize: btnFontSize, color: theme.primary }]}>
            A+
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lc.border,
    backgroundColor: lc.surface,
  },
  label: {
    color: lc.textMuted,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  btn: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  btnPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  btnDisabled: {
    opacity: 0.38,
  },
  btnText: {
    fontWeight: '900',
  },
  pct: {
    minWidth: 42,
    textAlign: 'center',
    fontWeight: '700',
  },
});

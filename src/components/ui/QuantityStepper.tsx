import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, typography, touchTargets, radii } from '@/theme';

interface QuantityStepperProps {
  quantity: number;
  onIncrement: () => void;
  onDecrement: () => void;
}

export function QuantityStepper({
  quantity,
  onIncrement,
  onDecrement,
}: QuantityStepperProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Quitar uno"
        onPress={onDecrement}
        style={({ pressed }) => [styles.btn, styles.minus, pressed && styles.pressed]}
      >
        <Text style={styles.symbol}>−</Text>
      </Pressable>

      <Text style={styles.qty} accessibilityLabel={`Cantidad ${quantity}`}>
        {quantity}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Agregar uno"
        onPress={onIncrement}
        style={({ pressed }) => [styles.btn, styles.plus, pressed && styles.pressed]}
      >
        <Text style={styles.symbol}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: touchTargets.huge,
    height: touchTargets.huge,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: {
    backgroundColor: colors.dangerLight,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  plus: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  symbol: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 36,
  },
  qty: {
    minWidth: 40,
    textAlign: 'center',
    fontSize: typography.headline,
    fontWeight: '700',
    color: colors.text,
  },
});

import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { formatCurrency } from '@/utils/formatCurrency';
import type { CartLine } from '@/types';
import { colors, typography, spacing, radii } from '@/theme';

interface CartItemRowProps {
  item: CartLine;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
}

export function CartItemRow({
  item,
  onIncrement,
  onDecrement,
  onRemove,
}: CartItemRowProps) {
  const lineTotal = item.unitPrice * item.quantity;

  return (
    <View style={styles.card} accessibilityLabel={`${item.name}, cantidad ${item.quantity}`}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          {item.brand ? (
            <Text style={styles.brand}>{item.brand}</Text>
          ) : null}
          <Text style={styles.unit}>
            {formatCurrency(item.unitPrice)} c/u
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Eliminar ${item.name}`}
          onPress={onRemove}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="trash-outline" size={28} color={colors.danger} />
        </Pressable>
      </View>

      <View style={styles.footer}>
        <QuantityStepper
          quantity={item.quantity}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
        <Text style={styles.lineTotal}>{formatCurrency(lineTotal)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  info: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  name: {
    fontSize: typography.bodyLarge,
    fontWeight: '700',
    color: colors.text,
  },
  brand: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: 4,
  },
  unit: {
    fontSize: typography.body,
    color: colors.textSecondary,
    marginTop: 6,
  },
  deleteBtn: {
    padding: spacing.xs,
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineTotal: {
    fontSize: typography.title,
    fontWeight: '800',
    color: colors.primary,
  },
});

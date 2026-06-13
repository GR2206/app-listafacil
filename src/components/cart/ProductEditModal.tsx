import { useEffect, useRef, useState } from 'react';

import {

  Modal,

  View,

  Text,

  Image,

  Pressable,

  StyleSheet,

  TextInput,

  KeyboardAvoidingView,

  Platform,

} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { QuantityStepper } from '@/components/ui/QuantityStepper';

import { CartPriceText } from '@/components/cart/CartPriceText';
import { formatPriceDisplay } from '@/utils/formatPriceDisplay';

import { useSupermarketTheme } from '@/context/ThemeContext';

import type { CartLine } from '@/types';

import { typography, spacing, radii, touchTargets } from '@/theme';
import { withClickSound } from '@/utils/withClickSound';
import { withTaskHaptic } from '@/utils/withTaskFeedback';



interface ProductEditModalProps {

  visible: boolean;

  item: CartLine | null;

  onClose: () => void;

  onConfirm: (lineId: string, quantity: number, unitPrice: number) => void;

}



function normalizePriceInput(text: string): string {

  return text.replace(/,/g, '.').replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');

}



function parsePriceInput(text: string): number {

  if (!text) return 0;

  const value = parseFloat(text);

  if (!Number.isFinite(value) || value <= 0) return 0;

  return Math.round(value * 100) / 100;

}



function priceToInput(price: number): string {

  if (!price || price <= 0) return '';

  return Number.isInteger(price) ? String(price) : String(price);

}



export function ProductEditModal({

  visible,

  item,

  onClose,

  onConfirm,

}: ProductEditModalProps) {

  const { theme } = useSupermarketTheme();

  const [quantity, setQuantity] = useState(1);

  const [priceInput, setPriceInput] = useState('');

  const inputRef = useRef<TextInput>(null);



  useEffect(() => {

    if (item && visible) {

      setQuantity(item.quantity);

      setPriceInput(priceToInput(item.unitPrice));

      const timer = setTimeout(() => inputRef.current?.focus(), 200);

      return () => clearTimeout(timer);

    }

  }, [item, visible]);



  if (!item) return null;



  const unitPrice = parsePriceInput(priceInput);

  const lineTotal = unitPrice * quantity;



  const handlePriceChange = (text: string) => {

    setPriceInput(normalizePriceInput(text));

  };



  const handleOk = () => {

    if (quantity < 1 || unitPrice < 0.01) return;

    onConfirm(item.id, quantity, unitPrice);

  };



  return (

    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>

      <KeyboardAvoidingView

        style={styles.backdrop}

        behavior={Platform.OS === 'ios' ? 'padding' : undefined}

      >

        <Pressable
          style={styles.backdropTap}
          onPress={withClickSound(onClose)}
          accessibilityLabel="Cerrar"
        />

        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>

          <Pressable

            accessibilityRole="button"

            accessibilityLabel="Cerrar ventana"

            onPress={withClickSound(onClose)}

            style={styles.closeBtn}

            hitSlop={12}

          >

            <Ionicons name="close" size={26} color={theme.textMuted} />

          </Pressable>



          <View style={styles.headerRow}>

            {item.imageUrl ? (

              <Image source={{ uri: item.imageUrl }} style={styles.photo} resizeMode="contain" />

            ) : (

              <View style={[styles.photoPlaceholder, { borderColor: theme.border }]}>

                <Ionicons name="cube-outline" size={28} color={theme.textMuted} />

              </View>

            )}

            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>

              {item.name}

            </Text>

          </View>



          <View style={styles.section}>

            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Cantidad</Text>

            <QuantityStepper

              quantity={quantity}

              onIncrement={() => setQuantity((q) => q + 1)}

              onDecrement={() => setQuantity((q) => Math.max(1, q - 1))}

            />

          </View>



          <View style={styles.priceSection}>

            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Precio unitario</Text>

            <TextInput

              ref={inputRef}

              style={[

                styles.priceInput,

                {

                  color: theme.text,

                  borderColor: theme.primary,

                  backgroundColor: theme.surfaceElevated,

                },

              ]}

              value={priceInput}

              onChangeText={handlePriceChange}

              keyboardType="decimal-pad"

              placeholder="0"

              placeholderTextColor={theme.textMuted}

              selectTextOnFocus

              accessibilityLabel="Precio unitario"

            />

            <View style={styles.lineTotalRow}>
              <Text style={[styles.lineTotal, { color: theme.textMuted }]}>Total línea: </Text>
              <CartPriceText
                amount={lineTotal}
                style={[styles.lineTotal, { color: theme.text }]}
                unavailableStyle={[styles.lineTotalUnavailable, { color: theme.textMuted }]}
              />
            </View>

          </View>



          <Pressable

            accessibilityRole="button"

            accessibilityLabel="Confirmar precio"

            onPress={withTaskHaptic(handleOk, 'medium')}

            disabled={quantity < 1 || unitPrice < 0.01}

            style={({ pressed }) => [

              styles.okBtn,

              { backgroundColor: theme.primary },

              (quantity < 1 || unitPrice < 0.01) && styles.okDisabled,

              pressed && styles.btnPressed,

            ]}

          >

            <Ionicons name="checkmark-circle" size={24} color={theme.textOnPrimary} />

            <Text style={[styles.okText, { color: theme.textOnPrimary }]}>OK</Text>

          </Pressable>

        </View>

      </KeyboardAvoidingView>

    </Modal>

  );

}



const styles = StyleSheet.create({

  backdrop: {

    flex: 1,

    backgroundColor: 'rgba(0,0,0,0.6)',

    justifyContent: 'center',

    alignItems: 'center',

    padding: spacing.lg,

  },

  backdropTap: {

    ...StyleSheet.absoluteFillObject,

  },

  sheet: {

    width: '88%',

    maxWidth: 340,

    borderRadius: radii.lg,

    padding: spacing.md,

    paddingTop: spacing.lg,

    borderWidth: 1,

    zIndex: 2,

  },

  closeBtn: {

    position: 'absolute',

    top: 8,

    right: 8,

    width: 36,

    height: 36,

    alignItems: 'center',

    justifyContent: 'center',

    zIndex: 3,

  },

  headerRow: {

    flexDirection: 'row',

    alignItems: 'center',

    gap: spacing.sm,

    marginBottom: spacing.md,

    paddingRight: 28,

  },

  photo: {

    width: 52,

    height: 52,

    borderRadius: 8,

    backgroundColor: 'transparent',

  },

  photoPlaceholder: {

    width: 52,

    height: 52,

    borderRadius: 8,

    alignItems: 'center',

    justifyContent: 'center',

    borderWidth: 1,

  },

  name: {

    flex: 1,

    fontSize: typography.body,

    fontWeight: '700',

  },

  section: {

    alignItems: 'center',

    gap: spacing.xs,

    marginBottom: spacing.md,

  },

  priceSection: {

    gap: spacing.xs,

    marginBottom: spacing.md,

  },

  sectionLabel: {

    fontSize: 12,

    fontWeight: '700',

    textTransform: 'uppercase',

    letterSpacing: 0.8,

    textAlign: 'center',

  },

  priceInput: {

    fontSize: typography.title,

    fontWeight: '800',

    textAlign: 'center',

    borderWidth: 2,

    borderRadius: radii.md,

    paddingVertical: spacing.sm,

    paddingHorizontal: spacing.md,

    minHeight: touchTargets.large,

  },

  lineTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },

  lineTotal: {

    fontSize: typography.caption,

    fontWeight: '600',

    textAlign: 'center',

  },

  lineTotalUnavailable: {

    fontSize: typography.caption,

    fontWeight: '600',

    fontStyle: 'italic',

    textAlign: 'center',

  },

  okBtn: {

    minHeight: touchTargets.large,

    borderRadius: radii.lg,

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'center',

    gap: 8,

  },

  okDisabled: {

    opacity: 0.45,

  },

  okText: {

    fontSize: typography.button,

    fontWeight: '800',

  },

  btnPressed: {

    opacity: 0.88,

  },

});



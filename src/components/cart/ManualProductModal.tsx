import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useSupermarketTheme } from '@/context/ThemeContext';
import { radii, touchTargets } from '@/theme';
import { withClickSound } from '@/utils/withClickSound';
import { withTaskHaptic } from '@/utils/withTaskFeedback';

interface ManualProductModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (name: string, price: number) => void;
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

export function ManualProductModal({
  visible,
  onClose,
  onConfirm,
}: ManualProductModalProps) {
  const { theme } = useSupermarketTheme();
  const [name, setName] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setPriceInput('');
    const timer = setTimeout(() => nameRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, [visible]);

  const unitPrice = parsePriceInput(priceInput);
  const canConfirm = name.trim().length > 0 && unitPrice > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(name.trim(), unitPrice);
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

          <View style={styles.titleRow}>
            <Ionicons name="create-outline" size={24} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>Agregar manual</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Nombre</Text>
            <TextInput
              ref={nameRef}
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.surfaceElevated,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Pan casero"
              placeholderTextColor={theme.textMuted}
              maxLength={80}
              accessibilityLabel="Nombre del producto"
            />
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>Precio</Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  borderColor: theme.primary,
                  backgroundColor: theme.surfaceElevated,
                },
              ]}
              value={priceInput}
              onChangeText={(text) => setPriceInput(normalizePriceInput(text))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              selectTextOnFocus
              accessibilityLabel="Precio del producto"
            />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Confirmar producto manual"
            onPress={withTaskHaptic(handleConfirm, 'medium')}
            disabled={!canConfirm}
            style={({ pressed }) => [
              styles.okBtn,
              { backgroundColor: theme.primary },
              !canConfirm && styles.okDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="checkmark-circle" size={24} color={theme.textOnPrimary} />
            <Text style={[styles.okText, { color: theme.textOnPrimary }]}>Agregar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: 20,
    paddingTop: 44,
    gap: 14,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 2,
    minWidth: touchTargets.min,
    minHeight: touchTargets.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  section: {
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    minHeight: touchTargets.min,
    borderWidth: 1.5,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  okBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: touchTargets.min,
    borderRadius: radii.md,
    marginTop: 4,
  },
  okDisabled: {
    opacity: 0.45,
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  okText: {
    fontSize: 16,
    fontWeight: '800',
  },
});

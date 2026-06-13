import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupermarketTheme } from '@/context/ThemeContext';
import { withClickSound } from '@/utils/withClickSound';

interface UndoRemoveToastProps {
  productName: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoRemoveToast({ productName, onUndo, onDismiss }: UndoRemoveToastProps) {
  const { theme } = useSupermarketTheme();

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View
        style={[styles.toast, { backgroundColor: theme.surface, borderColor: theme.border }]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
      >
        <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
        <Text style={[styles.message, { color: theme.text }]} numberOfLines={1}>
          {productName} eliminado
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Deshacer eliminación"
          onPress={withClickSound(onUndo)}
          style={({ pressed }) => [styles.undoBtn, pressed && styles.pressed]}
        >
          <Text style={[styles.undoText, { color: theme.primary }]}>Deshacer</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar aviso"
          onPress={withClickSound(onDismiss)}
          hitSlop={8}
        >
          <Ionicons name="close" size={16} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 112,
    zIndex: 30,
    elevation: 30,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  message: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    minWidth: 0,
  },
  undoBtn: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  undoText: {
    fontSize: 13,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.8,
  },
});

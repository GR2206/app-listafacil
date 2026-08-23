import { Modal, View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';

import { LOCATION_PERMISSION_MESSAGE, LOCATION_PERMISSION_TITLE } from '@/config/locationPermission';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';

interface LocationPermissionExplainerProps {
  visible: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

export function LocationPermissionExplainer({
  visible,
  onCancel,
  onContinue,
}: LocationPermissionExplainerProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{LOCATION_PERMISSION_TITLE}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator
          >
            <Text style={styles.body}>{LOCATION_PERMISSION_MESSAGE}</Text>
          </ScrollView>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancelar"
              onPress={onCancel}
              style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.btnGhostText}>Cancelar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continuar y permitir ubicación"
              onPress={onContinue}
              style={({ pressed }) => [styles.btnPrimary, pressed && { opacity: 0.88 }]}
            >
              <Text style={styles.btnPrimaryText}>Continuar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    backgroundColor: homeColors.surfaceElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: homeColors.border,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    maxHeight: '70%',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: homeColors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 220,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 21,
    color: homeColors.textMuted,
    textAlign: 'left',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  btnGhost: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  btnGhostText: {
    fontSize: 14,
    fontWeight: '700',
    color: homeColors.textMuted,
  },
  btnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: homeColors.logoRing,
  },
  btnPrimaryText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#050508',
  },
});

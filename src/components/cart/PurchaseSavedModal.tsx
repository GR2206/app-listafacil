import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { APP_DOWNLOAD_URL, SHARE_INVITATION_TITLE } from '@/config/appLinks';
import { useSupermarketTheme } from '@/context/ThemeContext';
import { homeColors } from '@/theme/home';
import { radii, spacing, typography } from '@/theme';
import { withClickSound } from '@/utils/withClickSound';

const SHARE_LEGEND =
  'Compartir tu ahorro ayuda a que muchas personas encuentren ese ahorro ganador. Esto no comparte ni tus datos personales ni económicos, solo el ahorro que tuviste.';

interface PurchaseSavedModalProps {
  visible: boolean;
  supermarketName: string;
  onShare: () => void;
  onViewPurchases: () => void;
  onClose: () => void;
}

export function PurchaseSavedModal({
  visible,
  supermarketName,
  onShare,
  onViewPurchases,
  onClose,
}: PurchaseSavedModalProps) {
  const { theme } = useSupermarketTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${theme.primary}18` }]}>
            <Ionicons name="checkmark-circle" size={36} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>¡Compra guardada!</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            Tu compra en {supermarketName} quedó registrada.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Compartir mi ahorro"
            onPress={withClickSound(onShare)}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="share-social-outline" size={18} color={theme.textOnPrimary} />
            <Text style={[styles.primaryBtnText, { color: theme.textOnPrimary }]}>
              Compartir mi ahorro
            </Text>
          </Pressable>

          <Text style={[styles.legend, { color: theme.textMuted }]}>{SHARE_LEGEND}</Text>

          <View
            style={[
              styles.invitePreview,
              { backgroundColor: `${homeColors.neonBlue}14`, borderColor: `${homeColors.neonBlue}44` },
            ]}
            accessibilityRole="text"
            accessibilityLabel={`También se enviará: ${SHARE_INVITATION_TITLE}. Descargá la app en ${APP_DOWNLOAD_URL}`}
          >
            <Text style={[styles.inviteTitle, { color: theme.text }]}>{SHARE_INVITATION_TITLE}</Text>
            <Text style={[styles.inviteLink, { color: homeColors.neonBlue }]}>{APP_DOWNLOAD_URL}</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver mis compras"
            onPress={withClickSound(onViewPurchases)}
            style={({ pressed }) => [
              styles.secondaryBtn,
              { borderColor: theme.border, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Ver mis compras</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            onPress={withClickSound(onClose)}
            style={({ pressed }) => [styles.closeLink, pressed && styles.closePressed]}
          >
            <Text style={[styles.closeLinkText, { color: theme.textMuted }]}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  sheet: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
    textAlign: 'center',
  },
  message: {
    fontSize: typography.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    marginTop: spacing.xs,
  },
  primaryBtnText: {
    fontSize: typography.caption,
    fontWeight: '800',
  },
  legend: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  invitePreview: {
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    gap: 4,
    marginBottom: spacing.sm,
  },
  inviteTitle: {
    fontSize: typography.caption,
    fontWeight: '800',
    textAlign: 'center',
  },
  inviteLink: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryBtn: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: typography.caption,
    fontWeight: '700',
  },
  closeLink: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  closePressed: {
    opacity: 0.7,
  },
  closeLinkText: {
    fontSize: typography.caption,
    fontWeight: '600',
  },
});

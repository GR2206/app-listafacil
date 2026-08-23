import { Modal, Pressable, StyleSheet, Text, View, Platform } from 'react-native';

import type { AppUpdatePrompt } from '@/services/appUpdateCheck';
import { getAndroidStoreUpdateUrls, getStoreUpdateUrl } from '@/config/appLinks';
import { openExternalUrlDirect } from '@/utils/safeLinking';
import { withClickSound } from '@/utils/withClickSound';
import { homeColors } from '@/theme/home';
import { radii, spacing, typography } from '@/theme';

interface UpdateAvailableModalProps {
  prompt: AppUpdatePrompt;
  onDismiss?: () => void;
}

export function UpdateAvailableModal({ prompt, onDismiss }: UpdateAvailableModalProps) {
  const openUpdate = withClickSound(() => {
    void (async () => {
      if (Platform.OS === 'android') {
        const { primary, fallback } = getAndroidStoreUpdateUrls();
        const opened = await openExternalUrlDirect(primary);
        if (!opened) {
          await openExternalUrlDirect(fallback, {
            failTitle: 'No se pudo abrir Play Store',
            failMessage: 'Buscá Lista Fácil en Google Play e instalá la actualización.',
          });
        }
        return;
      }

      await openExternalUrlDirect(prompt.updateUrl || getStoreUpdateUrl(), {
        failTitle: 'No se pudo abrir App Store',
        failMessage: 'Buscá Lista Fácil en la App Store e instalá la actualización.',
      });
    })();
  });

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={prompt.forceUpdate ? undefined : onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{prompt.title}</Text>
          <Text style={styles.message}>{prompt.message}</Text>
          <Text style={styles.versionMeta}>
            Versión instalada: {prompt.currentVersionCode} · Nueva: {prompt.latestVersionCode}
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={openUpdate}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.primaryBtnText}>Actualizar ahora</Text>
          </Pressable>

          {!prompt.forceUpdate && onDismiss ? (
            <Pressable
              accessibilityRole="button"
              onPress={withClickSound(onDismiss)}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
            >
              <Text style={styles.secondaryBtnText}>Más tarde</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0A1628',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: homeColors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.headline,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  message: {
    fontSize: typography.body,
    lineHeight: 22,
    color: 'rgba(200, 220, 240, 0.92)',
    textAlign: 'center',
  },
  versionMeta: {
    fontSize: 11,
    color: 'rgba(140, 180, 217, 0.72)',
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: homeColors.logoRing,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontSize: typography.button,
    fontWeight: '800',
    color: '#001018',
  },
  secondaryBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: typography.body,
    fontWeight: '600',
    color: 'rgba(180, 210, 235, 0.85)',
  },
  btnPressed: {
    opacity: 0.88,
  },
});

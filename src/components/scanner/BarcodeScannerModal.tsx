import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { resolveScannedProduct } from '@/services/scanProductResolver';
import { normalizeBarcode } from '@/services/firebaseProducts';
import { extractScanNameHint } from '@/utils/extractScanNameHint';
import { useSupermarketTheme } from '@/context/ThemeContext';
import { hexToRgba } from '@/utils/hexToRgba';
import { openAppSettings } from '@/utils/safeLinking';
import type { Product } from '@/types';
import {
  feedbackScanSuccess,
  feedbackScanError,
  initScanFeedback,
} from '@/services/scanFeedback';
import { logScanSuccess } from '@/services/analytics';
import { typography, spacing, radii } from '@/theme';
import { withClickSound } from '@/utils/withClickSound';
import { ScannerViewListFab } from '@/components/scanner/ScannerViewListFab';
import { ScanSuccessToast } from '@/components/scanner/ScanSuccessToast';

const SCANNER_GUIDE_LINE_COLOR = '#E53935';
const SAME_BARCODE_COOLDOWN_MS = 2600;
const SCAN_RELOCK_MS = 900;
const SUCCESS_TOAST_MS = 2800;

interface BarcodeScannerModalProps {
  visible: boolean;
  supermarketId: string;
  supermarketName?: string;
  onClose: () => void;
  onProductScanned: (product: Product) => void;
  onProductNotFound?: (payload: {
    barcode: string;
    rawData: string;
    nameHint?: string;
    pendingQueued: boolean;
    nameSearchUsed: boolean;
  }) => void;
}

export function BarcodeScannerModal({
  visible,
  supermarketId,
  supermarketName,
  onClose,
  onProductScanned,
  onProductNotFound,
}: BarcodeScannerModalProps) {
  const { theme } = useSupermarketTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<{ name: string; price: number } | null>(null);
  const scanLock = useRef(false);
  const lastScannedBarcode = useRef<string | null>(null);
  const lastScanAt = useRef(0);
  const relockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const themed = useMemo(
    () => ({
      overlayTint: hexToRgba(theme.primary, 0.88),
      panelBg: hexToRgba(theme.surface, 0.92),
      guideLine: SCANNER_GUIDE_LINE_COLOR,
      guideGlow: SCANNER_GUIDE_LINE_COLOR,
      hintText: theme.textOnPrimary,
      statusText: theme.text,
      closeIcon: theme.textOnPrimary,
      spinner: theme.textOnPrimary,
    }),
    [theme]
  );

  useEffect(() => {
    void initScanFeedback();
  }, []);

  useEffect(() => {
    if (!visible || !permission || permission.granted) return;
    if (permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  useEffect(() => {
    return () => {
      if (relockTimer.current) clearTimeout(relockTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      scanLock.current = false;
      lastScannedBarcode.current = null;
      lastScanAt.current = 0;
      setMessage('');
      setLoading(false);
      setSuccessToast(null);
      if (relockTimer.current) clearTimeout(relockTimer.current);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    }
  }, [visible]);

  const showSuccessToast = (name: string, price: number) => {
    setSuccessToast({ name, price });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setSuccessToast(null);
      toastTimer.current = null;
    }, SUCCESS_TOAST_MS);
  };

  const scheduleScanUnlock = (barcode: string) => {
    lastScannedBarcode.current = barcode;
    lastScanAt.current = Date.now();
    setLoading(false);
    setMessage('');

    if (relockTimer.current) clearTimeout(relockTimer.current);
    relockTimer.current = setTimeout(() => {
      scanLock.current = false;
      relockTimer.current = null;
    }, SCAN_RELOCK_MS);
  };

  const handleBarcode = async ({ data }: { data: string }) => {
    if (scanLock.current) return;

    const ean13 = normalizeBarcode(data);
    if (!ean13) return;

    const now = Date.now();
    if (
      ean13 === lastScannedBarcode.current &&
      now - lastScanAt.current < SAME_BARCODE_COOLDOWN_MS
    ) {
      return;
    }

    scanLock.current = true;
    setLoading(true);
    setMessage('Buscando código…');

    const nameHint = extractScanNameHint(data, ean13);
    if (nameHint) {
      setMessage('Buscando código y nombre…');
    }

    try {
      const lookup = await resolveScannedProduct(data, supermarketId, {
        supermarketName,
        nameHint,
      });

      if (lookup.product) {
        feedbackScanSuccess();
        void logScanSuccess(lookup.product.name, lookup.product.price);
        onProductScanned(lookup.product);
        showSuccessToast(lookup.product.name, lookup.product.price);
        scheduleScanUnlock(ean13);
        return;
      }

      if (lookup.nameSearchUsed) {
        setMessage('Sin coincidencias por nombre…');
      }

      feedbackScanError();
      setLoading(false);
      setMessage('');
      scanLock.current = false;
      onClose();
      onProductNotFound?.({
        barcode: lookup.normalizedBarcode ?? ean13,
        rawData: data,
        nameHint: lookup.nameHint,
        pendingQueued: lookup.pendingQueued,
        nameSearchUsed: lookup.nameSearchUsed,
      });
    } catch {
      feedbackScanError();
      setLoading(false);
      setMessage('');
      scanLock.current = false;
    }
  };

  if (!visible) {
    return null;
  }

  if (!permission) {
    return (
      <Modal visible animationType="slide">
        <View style={[styles.permissionBox, { backgroundColor: theme.background }]}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.permissionText, { color: theme.textMuted, marginTop: spacing.lg }]}>
            Preparando cámara…
          </Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;

    return (
      <Modal visible animationType="slide">
        <View style={[styles.permissionBox, { backgroundColor: theme.background }]}>
          <Ionicons name="camera-outline" size={56} color={theme.primary} style={styles.permissionIcon} />
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            {blocked ? 'Cámara desactivada' : 'Necesitamos la cámara'}
          </Text>
          <Text style={[styles.permissionText, { color: theme.textMuted }]}>
            {blocked
              ? 'Activá el permiso de cámara en Ajustes para escanear productos en el supermercado.'
              : 'Para escanear productos en el supermercado necesitamos acceso a la cámara.'}
          </Text>
          {blocked ? (
            <Pressable
              style={[styles.permissionBtn, { backgroundColor: theme.primary }]}
              onPress={withClickSound(openAppSettings)}
            >
              <Text style={[styles.permissionBtnText, { color: theme.textOnPrimary }]}>
                Abrir Ajustes
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.permissionBtn, { backgroundColor: theme.primary }]}
              onPress={withClickSound(() => void requestPermission())}
            >
              <Text style={[styles.permissionBtnText, { color: theme.textOnPrimary }]}>
                Permitir cámara
              </Text>
            </Pressable>
          )}
          <Pressable onPress={withClickSound(onClose)} style={styles.closeLink}>
            <Text style={[styles.closeLinkText, { color: theme.primary }]}>
              Volver
            </Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
          }}
          onBarcodeScanned={visible ? handleBarcode : undefined}
        />

        <View
          style={[styles.overlay, { backgroundColor: hexToRgba(theme.background, 0.35) }]}
          pointerEvents="box-none"
        >
          <Pressable
            accessibilityLabel="Cerrar escáner"
            onPress={withClickSound(onClose)}
            style={[styles.closeBtn, { backgroundColor: themed.overlayTint }]}
          >
            <Ionicons name="close" size={32} color={themed.closeIcon} />
          </Pressable>

          <View style={styles.scanZone}>
            <View
              style={[
                styles.guideLine,
                {
                  backgroundColor: themed.guideLine,
                  shadowColor: themed.guideGlow,
                },
              ]}
            />
            <Text style={[styles.hint, { color: themed.hintText }]}>
              Alinee el código con la línea de guía
            </Text>
          </View>

          {loading || message ? (
            <View
              style={[
                styles.statusBar,
                {
                  backgroundColor: themed.panelBg,
                  borderColor: theme.primary,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={theme.primary} />
              ) : null}
              <Text style={[styles.statusText, { color: themed.statusText }]}>
                {message}
              </Text>
            </View>
          ) : null}
        </View>

        {successToast ? (
          <ScanSuccessToast productName={successToast.name} price={successToast.price} />
        ) : null}

        <ScannerViewListFab onPress={withClickSound(onClose)} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 48,
    paddingHorizontal: spacing.lg,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanZone: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideLine: {
    width: '92%',
    height: 4,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  hint: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontSize: typography.bodyLarge,
    fontWeight: '600',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
  statusText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  permissionIcon: {
    marginBottom: spacing.lg,
  },
  permissionTitle: {
    fontSize: typography.headline,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  permissionText: {
    fontSize: typography.body,
    marginBottom: spacing.xl,
    textAlign: 'center',
    maxWidth: 320,
  },
  permissionBtn: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    alignItems: 'center',
    alignSelf: 'stretch',
    maxWidth: 320,
  },
  permissionBtnText: {
    fontSize: typography.button,
    fontWeight: '700',
  },
  closeLink: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  closeLinkText: {
    fontSize: typography.body,
    fontWeight: '600',
  },
});

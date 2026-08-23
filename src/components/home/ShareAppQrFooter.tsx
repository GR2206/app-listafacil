import { useMemo, useState } from 'react';

import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Share,
  Modal,
  ScrollView,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import {
  APP_BRAND_NAME,
  APP_STORE_URL,
  PLAY_STORE_URL,
  buildShareInvitationBlock,
} from '@/config/appLinks';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';
import type { ScaledMenuMetrics } from '@/theme/scaledMenuMetrics';
import { withClickSound } from '@/utils/withClickSound';

type StoreKind = 'play' | 'apple';

interface ShareAppQrFooterProps {
  metrics: ScaledMenuMetrics;
}

function StoreBadge({
  kind,
  height,
  onPress,
}: {
  kind: StoreKind;
  height: number;
  onPress: () => void;
}) {
  const isPlay = kind === 'play';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={isPlay ? 'Abrir QR de Google Play' : 'Abrir QR de App Store'}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: '100%' as const,
          height,
          borderRadius: 10,
          backgroundColor: '#000000',
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          paddingHorizontal: 14,
          gap: 12,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      <Ionicons
        name={isPlay ? 'logo-google-playstore' : 'logo-apple'}
        size={Math.round(height * 0.48)}
        color="#FFFFFF"
      />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: Math.max(9, Math.round(height * 0.22)),
            fontWeight: '600',
            letterSpacing: 0.3,
          }}
        >
          {isPlay ? 'DISPONIBLE EN' : 'Descárgalo en el'}
        </Text>
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: Math.max(15, Math.round(height * 0.36)),
            fontWeight: '700',
            marginTop: 1,
          }}
        >
          {isPlay ? 'Google Play' : 'App Store'}
        </Text>
      </View>
    </Pressable>
  );
}

export function ShareAppQrFooter({ metrics: m }: ShareAppQrFooterProps) {
  const [qrStore, setQrStore] = useState<StoreKind | null>(null);

  const badgeHeight = Math.min(54, Math.max(46, m.iconLg * 1.9));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: m.spacingMd,
          paddingTop: m.spacingMd,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: homeColors.border,
          alignItems: 'center',
          gap: m.spacingSm,
        },
        title: {
          fontSize: m.caption,
          fontWeight: '800',
          color: homeColors.text,
          textAlign: 'center',
        },
        subtitle: {
          fontSize: Math.max(11, m.caption - 1),
          color: homeColors.textMuted,
          textAlign: 'center',
          lineHeight: Math.round(Math.max(11, m.caption - 1) * 1.35),
          paddingHorizontal: 4,
        },
        badgesCol: {
          width: '100%',
          gap: 10,
          marginTop: 4,
        },
        shareBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: radii.md,
          backgroundColor: homeColors.surfaceElevated,
          borderWidth: 1,
          borderColor: homeColors.border,
          marginTop: 2,
        },
        shareText: {
          fontSize: m.caption,
          fontWeight: '800',
          color: homeColors.text,
        },
        modalRoot: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.72)',
          justifyContent: 'center',
          paddingHorizontal: 24,
        },
        modalCard: {
          backgroundColor: homeColors.surfaceElevated,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: homeColors.border,
          padding: 18,
          alignItems: 'center',
          gap: 12,
          maxHeight: '80%',
        },
        modalTitle: {
          fontSize: m.body,
          fontWeight: '800',
          color: homeColors.text,
          textAlign: 'center',
        },
        modalHint: {
          fontSize: Math.max(12, m.caption),
          color: homeColors.textMuted,
          textAlign: 'center',
          lineHeight: Math.round(Math.max(12, m.caption) * 1.35),
        },
        qrBox: {
          padding: 12,
          borderRadius: radii.md,
          backgroundColor: '#FFFFFF',
        },
        modalLink: {
          fontSize: Math.max(11, m.caption - 1),
          color: homeColors.logoRing,
          fontWeight: '700',
          textAlign: 'center',
        },
        closeBtn: {
          marginTop: 4,
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderRadius: radii.md,
          backgroundColor: homeColors.logoRing,
        },
        closeText: {
          fontSize: m.caption,
          fontWeight: '800',
          color: '#050508',
        },
      }),
    [m]
  );

  const qrUrl = qrStore === 'apple' ? APP_STORE_URL : PLAY_STORE_URL;
  const qrTitle = qrStore === 'apple' ? 'App Store' : 'Google Play';

  const handleShare = () => {
    void Share.share({
      message: buildShareInvitationBlock(),
      title: APP_BRAND_NAME,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Compartí {APP_BRAND_NAME}</Text>
      <Text style={styles.subtitle}>Tocá una tienda para mostrar el QR de descarga</Text>

      <View style={styles.badgesCol}>
        <StoreBadge
          kind="play"
          height={badgeHeight}
          onPress={withClickSound(() => setQrStore('play'))}
        />
        <StoreBadge
          kind="apple"
          height={badgeHeight}
          onPress={withClickSound(() => setQrStore('apple'))}
        />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compartir enlace de la app"
        onPress={withClickSound(handleShare)}
        style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.88 }]}
      >
        <Ionicons name="share-social-outline" size={16} color={homeColors.text} />
        <Text style={styles.shareText}>Compartir enlace</Text>
      </Pressable>

      <Modal
        visible={qrStore !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setQrStore(null)}
      >
        <Pressable style={styles.modalRoot} onPress={() => setQrStore(null)}>
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ alignItems: 'center', gap: 12 }}
            >
              <Text style={styles.modalTitle}>Descargar desde {qrTitle}</Text>
              <Text style={styles.modalHint}>Escaneá este QR con otro teléfono</Text>
              <View style={styles.qrBox}>
                <QRCode value={qrUrl} size={Math.min(200, m.iconLg * 7.5)} />
              </View>
              <Text style={styles.modalLink} selectable>
                {qrUrl}
              </Text>
              {qrStore === 'apple' && APP_STORE_URL.includes('search?') ? (
                <Text style={styles.modalHint}>
                  Link de App Store provisional (búsqueda). Lo actualizamos al salir publicada.
                </Text>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                onPress={withClickSound(() => setQrStore(null))}
                style={styles.closeBtn}
              >
                <Text style={styles.closeText}>Cerrar</Text>
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

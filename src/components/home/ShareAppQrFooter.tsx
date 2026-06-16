import { useMemo } from 'react';

import { View, Text, Pressable, StyleSheet, Share } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';

import {
  APP_DOWNLOAD_URL,
  APP_BRAND_NAME,
  buildShareInvitationBlock,
} from '@/config/appLinks';
import { homeColors } from '@/theme/home';
import { radii } from '@/theme';
import type { ScaledMenuMetrics } from '@/theme/scaledMenuMetrics';
import { withClickSound } from '@/utils/withClickSound';

interface ShareAppQrFooterProps {
  metrics: ScaledMenuMetrics;
}

export function ShareAppQrFooter({ metrics: m }: ShareAppQrFooterProps) {
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
          fontSize: Math.max(9, m.caption - 2),
          color: homeColors.textMuted,
          textAlign: 'center',
          lineHeight: 14,
        },
        qrBox: {
          padding: 10,
          borderRadius: radii.md,
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: homeColors.border,
        },
        link: {
          fontSize: Math.max(9, m.caption - 2),
          color: homeColors.logoRing,
          fontWeight: '700',
          textAlign: 'center',
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
        },
        shareText: {
          fontSize: m.caption,
          fontWeight: '800',
          color: homeColors.text,
        },
      }),
    [m]
  );

  const handleShare = () => {
    void Share.share({
      message: buildShareInvitationBlock(),
      title: APP_BRAND_NAME,
    });
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Compartí {APP_BRAND_NAME}</Text>
      <Text style={styles.subtitle}>Escaneá el QR o compartí el enlace para invitar a otros</Text>

      <View style={styles.qrBox}>
        <QRCode value={APP_DOWNLOAD_URL} size={Math.min(132, m.iconLg * 5)} />
      </View>

      <Text style={styles.link} selectable numberOfLines={2}>
        {APP_DOWNLOAD_URL}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compartir enlace de la app"
        onPress={withClickSound(handleShare)}
        style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.88 }]}
      >
        <Ionicons name="share-social-outline" size={16} color={homeColors.text} />
        <Text style={styles.shareText}>Compartir enlace</Text>
      </Pressable>
    </View>
  );
}

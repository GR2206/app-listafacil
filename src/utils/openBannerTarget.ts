import * as Clipboard from 'expo-clipboard';
import { Alert, Linking } from 'react-native';

import type { BannerSlotId } from '@/types/banner';
import { logBannerListaClick, logBannerTopClick } from '@/services/analytics';
import {
  buildInstagramDmUrl,
  extractInstagramUsernameFromBannerUrl,
  getInstagramBannerClipboardMessage,
  isInstagramBannerUrl,
} from '@/utils/instagramBannerLink';
import {
  presentInstagramClipboardNotice,
} from '@/utils/instagramClipboardNotice';
import { openExternalUrlDirect } from '@/utils/safeLinking';
import { isValidBannerTargetUrl } from '@/utils/validateBannerUrl';

function logBannerClick(slot: BannerSlotId): void {
  if (slot === 'top_banner') {
    void logBannerTopClick();
    return;
  }

  if (slot === 'list_banner') {
    void logBannerListaClick();
  }
}

async function openInstagramBannerTarget(targetUrl: string): Promise<boolean> {
  const username = extractInstagramUsernameFromBannerUrl(targetUrl);
  if (!username) {
    Alert.alert(
      'Enlace de Instagram inválido',
      'El banner debe usar el formato ig://username/nombredeusuario'
    );
    return false;
  }

  try {
    await Clipboard.setStringAsync(getInstagramBannerClipboardMessage());

    const dmUrl = buildInstagramDmUrl(username);
    await presentInstagramClipboardNotice();
    await Linking.openURL(dmUrl);
    return true;
  } catch {
    Alert.alert(
      'No se pudo abrir Instagram',
      'Verificá que tengas Instagram instalado e intentá de nuevo.'
    );
    return false;
  }
}

export async function openBannerTarget(
  bannerId: BannerSlotId,
  targetUrl: string | null | undefined
): Promise<boolean> {
  if (typeof targetUrl !== 'string') return false;

  const trimmed = targetUrl.trim();
  if (!trimmed) return false;

  logBannerClick(bannerId);

  if (isInstagramBannerUrl(trimmed)) {
    return openInstagramBannerTarget(trimmed);
  }

  if (!isValidBannerTargetUrl(trimmed)) return false;

  return openExternalUrlDirect(trimmed);
}

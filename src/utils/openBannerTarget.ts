import type { BannerSlotId } from '@/types/banner';
import { logBannerListaClick, logBannerTopClick } from '@/services/analytics';
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

export async function openBannerTarget(
  bannerId: BannerSlotId,
  targetUrl: string | null | undefined
): Promise<boolean> {
  if (!isValidBannerTargetUrl(targetUrl)) return false;

  logBannerClick(bannerId);
  return openExternalUrlDirect(targetUrl.trim());
}

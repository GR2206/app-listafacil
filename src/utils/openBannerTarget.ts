import type { BannerSlotId } from '@/types/banner';
import { logBannerOfferClick } from '@/services/analytics';
import { openExternalUrlDirect } from '@/utils/safeLinking';
import { isValidBannerTargetUrl } from '@/utils/validateBannerUrl';

export async function openBannerTarget(
  bannerId: BannerSlotId,
  targetUrl: string | null | undefined
): Promise<boolean> {
  if (!isValidBannerTargetUrl(targetUrl)) return false;

  void logBannerOfferClick(bannerId);
  return openExternalUrlDirect(targetUrl.trim());
}

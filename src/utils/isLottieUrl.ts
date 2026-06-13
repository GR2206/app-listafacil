import { isValidHttpUrl } from '@/utils/validateBannerUrl';

export function isLottieUrl(value: unknown): value is string {
  if (!isValidHttpUrl(value)) return false;

  try {
    const pathname = new URL(value.trim()).pathname.toLowerCase();
    return pathname.endsWith('.json') || pathname.endsWith('.lottie');
  } catch {
    return false;
  }
}

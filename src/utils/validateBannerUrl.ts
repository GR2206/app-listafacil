import {
  extractInstagramUsernameFromBannerUrl,
  isInstagramBannerUrl,
} from '@/utils/instagramBannerLink';

export function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  // Evita URLs pegadas con saltos de línea (rompen el Gist o el parseo).
  const trimmed = value.replace(/\s+/g, '').trim();
  if (!trimmed) return false;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidBannerTargetUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  const trimmed = value.replace(/\s+/g, '').trim();
  if (!trimmed) return false;

  if (isInstagramBannerUrl(trimmed)) {
    return extractInstagramUsernameFromBannerUrl(trimmed) !== null;
  }

  if (isValidHttpUrl(trimmed)) return true;

  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === 'mailto:' ||
      parsed.protocol === 'tel:' ||
      parsed.protocol === 'whatsapp:'
    );
  } catch {
    return false;
  }
}

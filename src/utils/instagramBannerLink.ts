const INSTAGRAM_BANNER_PREFIX = 'ig://username/';

const INSTAGRAM_DM_MESSAGE =
  'Hola, vi tu publicación en ListaFacil y me encantó! Quería recibir más info por favor!';

export function isInstagramBannerUrl(url: string): boolean {
  return url.trim().toLowerCase().startsWith('ig://');
}

export function extractInstagramUsernameFromBannerUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!isInstagramBannerUrl(trimmed)) return null;

  const lower = trimmed.toLowerCase();
  const prefixIndex = lower.indexOf(INSTAGRAM_BANNER_PREFIX);
  if (prefixIndex === -1) return null;

  const username = trimmed
    .slice(prefixIndex + INSTAGRAM_BANNER_PREFIX.length)
    .split(/[/?#]/)[0]
    ?.trim();

  return username || null;
}

export function buildInstagramDmUrl(username: string): string {
  return `https://ig.me/m/${encodeURIComponent(username)}`;
}

export function getInstagramBannerClipboardMessage(): string {
  return INSTAGRAM_DM_MESSAGE;
}

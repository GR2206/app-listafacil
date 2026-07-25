import type { ImageSourcePropType } from 'react-native';

export type BankBrandKey =
  | 'hipotecario'
  | 'galicia'
  | 'nacion'
  | 'bnaplus'
  | 'provincia'
  | 'modo'
  | 'mercadopago'
  | 'uala'
  | 'naranjax'
  | 'personalpay'
  | 'supervielle'
  | 'macro'
  | 'santander'
  | 'icbc'
  | 'coinag'
  | 'municipal'
  | 'santafe'
  | 'default';

/**
 * Logos PNG con fondo transparente (assets/banks).
 * Si falta uno, el badge cae al mark SVG.
 */
export const BANK_LOGO_IMAGES: Partial<Record<BankBrandKey, ImageSourcePropType>> = {
  hipotecario: require('../../assets/banks/hipotecario.png'),
  galicia: require('../../assets/banks/galicia.png'),
  nacion: require('../../assets/banks/nacion.png'),
  // BNA+ es billetera de Nación — mismo isotipo BNA (no el verde de Santa Fe).
  bnaplus: require('../../assets/banks/nacion.png'),
  modo: require('../../assets/banks/modo.png'),
  mercadopago: require('../../assets/banks/mercadopago.png'),
  uala: require('../../assets/banks/uala.png'),
  naranjax: require('../../assets/banks/naranjax.png'),
  personalpay: require('../../assets/banks/personalpay.png'),
  supervielle: require('../../assets/banks/supervielle.png'),
  macro: require('../../assets/banks/macro.png'),
  santander: require('../../assets/banks/santander.png'),
  icbc: require('../../assets/banks/icbc.png'),
  coinag: require('../../assets/banks/coinag.png'),
  municipal: require('../../assets/banks/municipal.png'),
  santafe: require('../../assets/banks/santafe.png'),
};

export function bankLogoImage(brandKey: BankBrandKey): ImageSourcePropType | null {
  return BANK_LOGO_IMAGES[brandKey] ?? null;
}

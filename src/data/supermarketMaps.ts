import { Alert } from 'react-native';

import { getAppSetting } from '@/db/database';
import { logSupermarketMapsClick } from '@/services/analytics';
import { trackMerchantEvent } from '@/services/merchantAnalytics';
import { openExternalUrlDirect } from '@/utils/safeLinking';

const DEFAULT_ZONE = 'Rosario';

/** Búsqueda en Google Maps por cadena + zona del usuario */
const SUPERMARKET_MAP_LABELS: Record<string, string> = {
  'la-reina': 'Supermercado La Reina',
  'la-gallega': 'Supermercado La Gallega',
  carrefour: 'Carrefour Hipermercado',
  jumbo: 'Jumbo Hipermercado',
  dar: 'Supermercado DAR',
  coto: 'Coto Supermercado',
  arcoiris: 'Supermercado Arcoiris',
  unico: 'Unico Supermercados',
  disco: 'Disco Supermercado',
  dia: 'Dia Supermercado',
  vea: 'Vea Supermercado',
  atomo: 'Atomo Supermercados',
  changomas: 'Chango Mas',
  'la-anonima': 'La Anonima',
  california: 'Supermercado California',
  yaguar: 'Yaguar Supermercado',
  maxiconsumo: 'Maxiconsumo',
  vital: 'Vital Supermercado',
  toledo: 'Toledo Supermercado',
};

function buildMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export async function openSupermarketInMaps(supermarketId: string): Promise<void> {
  const label = SUPERMARKET_MAP_LABELS[supermarketId];
  if (!label) {
    Alert.alert('Ubicación no disponible', 'No encontramos la dirección de este supermercado.');
    return;
  }

  const zone = (await getAppSetting('selected_zone')) ?? DEFAULT_ZONE;
  const query = `${label} ${zone}`;
  const url = buildMapsSearchUrl(query);

  void logSupermarketMapsClick(supermarketId, label);
  await trackMerchantEvent(supermarketId, 'maps_click');
  await openExternalUrlDirect(url, {
    failTitle: 'No se pudo abrir el mapa',
    failMessage: 'Verificá que tengas Google Maps u otra app de mapas instalada.',
  });
}

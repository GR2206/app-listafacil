import type { Product } from '@/types';
import { MOCK_SUPERMARKETS } from '@/data/mockSupermarkets';

const CATALOG = [
  {
    barcode: '7790310981234',
    name: 'Leche entera 1L',
    brand: 'La Serenísima',
    basePrice: 1250,
  },
  {
    barcode: '7790895001234',
    name: 'Pan lactal 450g',
    brand: 'Bimbo',
    basePrice: 1890,
  },
  {
    barcode: '7790740101234',
    name: 'Arroz largo fino 1kg',
    brand: 'Gallo Oro',
    basePrice: 980,
  },
  {
    barcode: '7791234567890',
    name: 'Aceite de girasol 900ml',
    brand: 'Cocinero',
    basePrice: 1450,
  },
  {
    barcode: '7799876543210',
    name: 'Yogur natural 190g',
    brand: 'Ser',
    basePrice: 620,
  },
];

/** Variación de precio por cadena para simular scrape real */
const PRICE_OFFSET: Record<string, number> = {
  'la-reina': 0,
  'la-gallega': 30,
  carrefour: -20,
  jumbo: 50,
  dar: 10,
  coto: -10,
  arcoiris: 15,
  unico: 12,
};

function buildCatalog(): Product[] {
  const products: Product[] = [];

  for (const market of MOCK_SUPERMARKETS) {
    const offset = PRICE_OFFSET[market.id] ?? 0;

    CATALOG.forEach((item, index) => {
      products.push({
        id: `${market.id}-p${index + 1}`,
        barcode: item.barcode,
        name: item.name,
        brand: item.brand,
        price: item.basePrice + offset,
        supermarketId: market.id,
      });
    });
  }

  return products;
}

export const MOCK_PRODUCTS: Product[] = buildCatalog();

export interface Supermarket {
  id: string;
  name: string;
  logoUrl?: string;
  slug: string;
  /** Fallback si no hay imagen de logo */
  initial?: string;
}

export interface ProductCatalogPrices {
  prices: Record<string, number>;
  syncedAt: Record<string, string>;
}

export interface Product {
  id: string;
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  price: number;
  supermarketId: string;
  updatedAt?: string;
  /** ISO de la última sync de precio para el super consultado */
  priceSyncedAt?: string;
  /** Precios del catálogo Firestore para todos los supers (un escaneo alcanza) */
  catalogPrices?: ProductCatalogPrices;
}

export interface CartLine {
  id: string;
  productId: string;
  barcode: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  unitPrice: number;
  quantity: number;
  supermarketId: string;
  /** Timestamp del último escaneo — define orden cronológico */
  scannedAt: number;
  /** Producto ingresado a mano; solo vive en memoria, no se persiste */
  isManual?: boolean;
}

export interface ActiveSession {
  supermarketId: string;
  supermarketName: string;
  startedAt: string;
}

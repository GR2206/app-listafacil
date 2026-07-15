export interface OfertaDiaItem {
  id: number;
  titulo: string;
  precio: string;
  imagen: string;
  cta: string;
  /** Etiqueta persuasiva: "Oportunidad Irrepetible" / "Ahorro de hoy: 20%" */
  gancho: string;
  /** Escasez: "Solo hoy" / "Hasta agotar stock" */
  urgencia: string;
  barcode: string;
  supermarketId: string;
  supermarketName: string;
  /** Porcentaje de ahorro vs otros supers (si aplica). */
  ahorroPct: number | null;
}

export interface OfertaDiaManifest {
  oferta_dia: OfertaDiaItem[];
}

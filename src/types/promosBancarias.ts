export interface PromoBancariaItem {
  id: string;
  banco: string;
  titulo: string;
  descuentoPct: number | null;
  /**
   * Impacto visual del ahorro en pesos (tope / reintegro máx.).
   * Si falta, se intenta parsear desde `tope`.
   */
  ahorroPesos: number | null;
  /** 0=dom … 6=sáb (JS getDay) */
  dias: number[];
  vigenciaDesde: string;
  vigenciaHasta: string;
  tope: string;
  medios: string[];
  /** IDs de súper; vacío = aplica a adheridos / genérica */
  supers: string[];
  ambito: 'national' | 'provinces';
  provincias: string[];
  url: string;
  prioridad: number;
  /** Horas restantes de vigencia (hasta medianoche AR o +24h) */
  venceEnHoras: number;
  enProximas24h?: boolean;
  /** True si el día de la semana de hoy está en `dias`. */
  aplicaHoy?: boolean;
}

export interface PromosBancariasManifest {
  updatedAt: string;
  fecha: string;
  diaSemana: number;
  diaLabel: string;
  header: string;
  timezone?: string;
  promos_bancarias: PromoBancariaItem[];
}

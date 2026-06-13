const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const AR_TIMEZONE = 'America/Argentina/Buenos_Aires';

export interface PriceSyncLabel {
  label: string;
  isStale: boolean;
  isSynced: boolean;
}

function toDate(value: string | number | null | undefined): Date | null {
  if (value == null) return null;

  const date = typeof value === 'number' ? new Date(value) : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function formatDateKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: AR_TIMEZONE }).format(date);
}

/** Fecha y hora para el encabezado de Mi Lista (es-AR). */
export function formatLastUpdateDateTime(
  syncedAt: string | number | null | undefined
): string {
  const date = toDate(syncedAt ?? null);
  if (!date) return 'sin datos';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: AR_TIMEZONE,
  }).format(date);
}

function formatRelativeAge(ageMs: number): string {
  const minutes = Math.floor(ageMs / (60 * 1000));
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) {
    return minutes === 1 ? 'hace 1 minuto' : `hace ${minutes} minutos`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? 'hace 1 hora' : `hace ${hours} horas`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? 'hace 1 día' : `hace ${days} días`;
}

export interface FormatPriceSyncOptions {
  /** Fecha YYYY-MM-DD del último reporte diario completado en Firestore. */
  dailyReportDate?: string | null;
}

/**
 * Etiqueta de sincronización por supermercado.
 * - Reporte diario de hoy → "Sincronizado"
 * - last_updated < 24h → "Actualizado hace X minutos/horas"
 * - Sin timestamp → "Sin sincronizar"
 */
export function formatPriceSyncLabel(
  syncedAt: string | number | null | undefined,
  options: FormatPriceSyncOptions = {}
): PriceSyncLabel {
  const todayKey = formatDateKey(new Date());
  const dailyReportDate = options.dailyReportDate?.trim() || null;

  if (dailyReportDate === todayKey) {
    return { label: 'Sincronizado', isStale: false, isSynced: true };
  }

  const date = toDate(syncedAt ?? null);
  if (!date) {
    return { label: 'Sin sincronizar', isStale: true, isSynced: false };
  }

  const now = new Date();
  const ageMs = Math.max(0, now.getTime() - date.getTime());
  const isWithinDay = ageMs < TWENTY_FOUR_HOURS_MS;

  if (isWithinDay) {
    return {
      label: `Actualizado ${formatRelativeAge(ageMs)}`,
      isStale: false,
      isSynced: false,
    };
  }

  return {
    label: `Actualizado ${formatRelativeAge(ageMs)}`,
    isStale: true,
    isSynced: false,
  };
}

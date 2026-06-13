/** Clave ISO de semana, ej. "2026-W23". */
export function getCurrentWeekKey(date = new Date()): string {
  const utc = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7
  );
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

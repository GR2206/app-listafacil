type PriceAuditPayload = Record<string, unknown>;

export function logPriceAudit(context: string, payload: PriceAuditPayload): void {
  console.log(`[PriceAudit:${context}]`, payload);
}

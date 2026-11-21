import type { Service } from "@/models/Service";

export interface CurrencyTotals {
  /** Currency code (e.g. "ARS"); null for services without a currency. */
  currency: string | null;
  pending: number;
  total: number;
  paidCount: number;
  count: number;
}

/** Groups services by currency code so amounts of different currencies are never summed together. */
export function groupServiceTotals(services: Service[]): CurrencyTotals[] {
  const groups = new Map<string | null, CurrencyTotals>();
  for (const s of services) {
    const key = s.currency?.symbol ?? null;
    const g = groups.get(key) ?? { currency: key, pending: 0, total: 0, paidCount: 0, count: 0 };
    const amount = s.amount || 0;
    g.total += amount;
    g.count += 1;
    if (s.isPaid) g.paidCount += 1;
    else g.pending += amount;
    groups.set(key, g);
  }
  return [...groups.values()];
}

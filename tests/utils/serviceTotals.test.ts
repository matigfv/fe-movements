import { describe, it, expect } from "vitest";
import type { Service } from "@/models/Service";
import { groupServiceTotals } from "@/utils/serviceTotals";

const svc = (over: Partial<Service>): Service => ({
  id: 1,
  amount: 100,
  description: "x",
  workspaceName: "w",
  workspaceId: 1,
  date: "2026-01-01",
  user: "u",
  currency: { id: 1, symbol: "ARS", description: "Peso" },
  lastPayment: null,
  isPaid: false,
  ...over,
});

describe("groupServiceTotals", () => {
  it("returns an empty list for no services", () => {
    expect(groupServiceTotals([])).toEqual([]);
  });

  it("groups a single currency with mixed paid/pending", () => {
    const res = groupServiceTotals([
      svc({ amount: 100, isPaid: true }),
      svc({ amount: 50 }),
      svc({ amount: 25.5 }),
    ]);
    expect(res).toEqual([
      { currency: "ARS", pending: 75.5, total: 175.5, paidCount: 1, count: 3 },
    ]);
  });

  it("keeps currencies separate, in first-seen order", () => {
    const eur = { id: 2, symbol: "EUR", description: "Euro" };
    const res = groupServiceTotals([
      svc({ amount: 10, currency: eur }),
      svc({ amount: 200 }),
      svc({ amount: 5, currency: eur, isPaid: true }),
    ]);
    expect(res.map((g) => g.currency)).toEqual(["EUR", "ARS"]);
    expect(res[0]).toMatchObject({ pending: 10, total: 15, paidCount: 1, count: 2 });
    expect(res[1]).toMatchObject({ pending: 200, total: 200, paidCount: 0, count: 1 });
  });

  it("groups services without currency under null", () => {
    const res = groupServiceTotals([svc({ currency: null, amount: 7 })]);
    expect(res).toEqual([{ currency: null, pending: 7, total: 7, paidCount: 0, count: 1 }]);
  });
});

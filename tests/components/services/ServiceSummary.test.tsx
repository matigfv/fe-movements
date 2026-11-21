import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Service } from "@/models/Service";
import { ServiceSummary } from "@/components/services/ServiceSummary";

vi.mock("@/apis/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { id: 1, email: "t@t.com", userType: "PERSONAL" },
    isLoading: false,
  }),
}));

const EUR = { id: 2, symbol: "EUR", description: "Euro" };
const ARS = { id: 1, symbol: "ARS", description: "Peso" };

const svc = (over: Partial<Service>): Service => ({
  id: 1,
  amount: 100,
  description: "x",
  workspaceName: "w",
  workspaceId: 1,
  date: "2026-01-01",
  user: "u",
  currency: ARS,
  lastPayment: null,
  isPaid: false,
  ...over,
});

describe("ServiceSummary", () => {
  it("single currency: shows the real code and es-AR digits, no '$'", () => {
    const { container } = render(
      <ServiceSummary
        isFetching={false}
        services={[
          svc({ id: 1, amount: 1000, currency: EUR }),
          svc({ id: 2, amount: 122, currency: EUR, isPaid: true }),
        ]}
      />,
    );
    expect(container.textContent).toContain("EUR 1.000 pendientes");
    expect(container.textContent).toContain("de EUR 1.122 en total");
    expect(container.textContent).not.toContain("$");
  });

  it("multiple currencies: one line per currency, never summed", () => {
    render(
      <ServiceSummary
        isFetching={false}
        services={[
          svc({ id: 1, amount: 1000, currency: EUR }),
          svc({ id: 2, amount: 50000, currency: ARS, isPaid: true }),
          svc({ id: 3, amount: 2500, currency: ARS }),
        ]}
      />,
    );
    const lines = screen.getAllByTestId("currency-line");
    expect(lines).toHaveLength(2);
    expect(lines[0].textContent).toContain("EUR 1.000 pendientes");
    expect(lines[0].textContent).toContain("de EUR 1.000 en total");
    expect(lines[1].textContent).toContain("ARS 2.500 pendientes");
    expect(lines[1].textContent).toContain("de ARS 52.500 en total");
    // count-based: 1 paid of 3, 2 pending
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "33");
  });
});

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Service } from "@/models/Service";
import { ServiceSummary } from "@/components/services/ServiceSummary";

const user = vi.hoisted(() => ({ userType: "PERSONAL" }));

vi.mock("@/apis/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { id: 1, email: "t@t.com", userType: user.userType },
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
  afterEach(() => {
    user.userType = "PERSONAL";
  });

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

  describe.each([
    ["PERSONAL", "servicio", "servicios"],
    ["ENTERPRISE", "gasto", "gastos"],
  ])("paid/pending counts (%s)", (userType, one, other) => {
    const withCounts = (paid: number, unpaid: number) => [
      ...Array.from({ length: paid }, (_, i) => svc({ id: i + 1, isPaid: true })),
      ...Array.from({ length: unpaid }, (_, i) => svc({ id: i + 100, isPaid: false })),
    ];
    const renderCounts = (paid: number, unpaid: number) => {
      user.userType = userType;
      return render(<ServiceSummary isFetching={false} services={withCounts(paid, unpaid)} />);
    };

    it("0 paid uses the plural", () => {
      const { container } = renderCounts(0, 2);
      expect(container.textContent).toContain(`0 ${other} al día`);
      expect(container.textContent).toContain(`2 ${other} pendientes`);
    });

    it("1 uses the singular", () => {
      const { container } = renderCounts(1, 1);
      expect(container.textContent).toContain(`1 ${one} al día`);
      expect(container.textContent).toContain(`1 ${one} pendiente`);
      expect(container.textContent).not.toContain(`1 ${other}`);
    });

    it("N uses the plural", () => {
      const { container } = renderCounts(3, 4);
      expect(container.textContent).toContain(`3 ${other} al día`);
      expect(container.textContent).toContain(`4 ${other} pendientes`);
    });
  });
});

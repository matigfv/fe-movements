import { describe, it, expect, vi, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import type { WorkspaceSummary } from "@/models/WorkspaceSummary";
import MonthlySummary from "@/components/home/MonthlySummary";
import dayjs from "dayjs";

import "dayjs/locale/es";
dayjs.locale("es");

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@react-keycloak/web", () => ({
  useKeycloak: vi.fn(() => ({
    keycloak: { authenticated: true },
    initialized: true,
  })),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockSummary: WorkspaceSummary = {
  year: dayjs().year(),
  month: dayjs().month() + 1,
  perCurrency: [
    {
      currency: "ARS",
      totalIncome: 500000,
      totalSpent: 320000,
      net: 180000,
      topSpendingCategory: "HOGAR",
      vsPreviousMonth: {
        previousMonthIncome: 450000,
        previousMonthSpent: 300000,
        incomeDelta: 50000,
        spentDelta: 20000,
      },
    },
    {
      currency: "USD",
      totalIncome: 1000,
      totalSpent: 750,
      net: 250,
      topSpendingCategory: "TRANSPORTE",
      vsPreviousMonth: {
        previousMonthIncome: 1000,
        previousMonthSpent: 800,
        incomeDelta: 0,
        spentDelta: -50,
      },
    },
  ],
  totalUsd: {
    totalIncome: 1383.08,
    totalSpent: 995.4,
    net: 387.68,
    vsPreviousMonth: {
      previousMonthIncome: 0,
      previousMonthSpent: 0,
      incomeDelta: 0,
      spentDelta: 0,
    },
  },
};

const mockSummaryOneMoneda: WorkspaceSummary = {
  ...mockSummary,
  perCurrency: [mockSummary.perCurrency[0]],
};

// ── MSW server ────────────────────────────────────────────────────────────────

const server = setupServer(
  http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
    HttpResponse.json(mockSummary),
  ),
  // DEFAULT_WORKSPACE must have a valid value for MonthlySummary to fetch
  http.get("http://localhost:8080/settings/defaults/DEFAULT_WORKSPACE", () =>
    HttpResponse.json({ key: "DEFAULT_WORKSPACE", value: 42 }),
  ),
  http.get("http://localhost:8080/settings/defaults/DEFAULT_CURRENCY", () =>
    HttpResponse.json({ key: "DEFAULT_CURRENCY", value: null }),
  ),
  http.get("http://localhost:8080/workspace/currencies", () =>
    HttpResponse.json([]),
  ),
  http.get("http://localhost:8080/budgets", () =>
    HttpResponse.json([]),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("MonthlySummary", () => {
  describe("header", () => {
    it("displays the correct month label in the section header", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      const expectedMonth = dayjs().locale("es").format("MMMM YYYY");
      expect(await screen.findByText(expectedMonth, { exact: false })).toBeInTheDocument();
    });
  });

  describe("hierarchy", () => {
    it("renders Diferencia as the hero KPI and Ingresado/Gastado as secondary", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      const hero = await screen.findByTestId("kpi-hero");
      expect(within(hero).getByText("Diferencia")).toBeInTheDocument();
      expect(within(hero).queryByText("Ingresado")).not.toBeInTheDocument();
      expect(within(hero).queryByText("Gastado")).not.toBeInTheDocument();

      const heroValue = hero.querySelector(".ant-statistic-content") as HTMLElement;
      const incomeValue = screen
        .getByText("Ingresado")
        .closest(".ant-card")!
        .querySelector(".ant-statistic-content") as HTMLElement;
      expect(heroValue.style.fontSize).toBe("34px");
      expect(incomeValue.style.fontSize).toBe("18px");
      expect(screen.getByText("Gastado")).toBeInTheDocument();
    });
  });

  describe("deltas", () => {
    const cardOf = (title: string) =>
      screen.getAllByText(title)[0].closest(".ant-card") as HTMLElement;

    it("describes increases in words with an up arrow for every KPI", async () => {
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json(mockSummaryOneMoneda),
        ),
      );
      render(<MonthlySummary />, { wrapper: makeWrapper() });
      await screen.findByText("HOGAR");

      // income +50.000, spent +20.000, net +30.000 (180.000 - 150.000)
      const income = within(cardOf("Ingresado"));
      expect(income.getByText("ARS 50.000 más que el mes pasado")).toBeInTheDocument();
      expect(income.getAllByRole("img", { name: "arrow-up" })).toHaveLength(2);

      // spending more is still an UP arrow; the words and error color say it is bad
      const spent = within(cardOf("Gastado"));
      const spentText = spent.getByText("ARS 20.000 más que el mes pasado");
      expect(spent.getAllByRole("img", { name: "arrow-up" }).length).toBeGreaterThanOrEqual(1);
      expect(spentText.style.color).not.toBe(income.getByText("ARS 50.000 más que el mes pasado").style.color);

      const net = within(cardOf("Diferencia"));
      expect(net.getByText("ARS 30.000 más que el mes pasado")).toBeInTheDocument();
    });

    it("describes decreases in words with a down arrow for every KPI", async () => {
      const down: WorkspaceSummary = {
        ...mockSummaryOneMoneda,
        perCurrency: [
          {
            ...mockSummaryOneMoneda.perCurrency[0],
            vsPreviousMonth: {
              previousMonthIncome: 501000,
              previousMonthSpent: 320300,
              incomeDelta: -1000,
              spentDelta: -300,
            },
          },
        ],
      };
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json(down),
        ),
      );
      render(<MonthlySummary />, { wrapper: makeWrapper() });
      await screen.findByText("HOGAR");

      const income = within(cardOf("Ingresado"));
      expect(income.getByText("ARS 1.000 menos que el mes pasado")).toBeInTheDocument();
      expect(income.getAllByRole("img", { name: "arrow-down" }).length).toBeGreaterThanOrEqual(1);

      const spent = within(cardOf("Gastado"));
      expect(spent.getByText("ARS 300 menos que el mes pasado")).toBeInTheDocument();

      // net = -1000 - (-300) = -700
      const net = within(cardOf("Diferencia"));
      expect(net.getByText("ARS 700 menos que el mes pasado")).toBeInTheDocument();
    });

    it("says unchanged when the delta is zero and keeps text at least 12px", async () => {
      const flat: WorkspaceSummary = {
        ...mockSummaryOneMoneda,
        perCurrency: [
          {
            ...mockSummaryOneMoneda.perCurrency[0],
            vsPreviousMonth: {
              previousMonthIncome: 500000,
              previousMonthSpent: 320000,
              incomeDelta: 0,
              spentDelta: 0,
            },
          },
        ],
      };
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json(flat),
        ),
      );
      render(<MonthlySummary />, { wrapper: makeWrapper() });
      await screen.findByText("HOGAR");

      const same = screen.getAllByText("Igual que el mes pasado");
      expect(same).toHaveLength(3);
      same.forEach((el) =>
        expect(parseInt(el.style.fontSize, 10)).toBeGreaterThanOrEqual(12),
      );
    });
  });

  describe("tabs — multiple currencies", () => {
    it("renders a tab for each currency", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      expect(await screen.findByRole("tab", { name: "ARS" })).toBeInTheDocument();
      expect(await screen.findByRole("tab", { name: "USD" })).toBeInTheDocument();
    });

    it("shows KPI cards for the default (first) currency tab", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      // Wait for tabs to appear (data loaded)
      await screen.findByRole("tab", { name: "ARS" });
      // KPI titles appear in the active tab panel
      expect(screen.getAllByText("Ingresado").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Gastado").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Diferencia").length).toBeGreaterThanOrEqual(1);
    });

    it("shows ARS top category on the first tab", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      expect(await screen.findByText("HOGAR")).toBeInTheDocument();
      expect(await screen.findByText("Mayor gasto del mes:")).toBeInTheDocument();
    });

    it("switches to USD tab and shows USD data", async () => {
      const user = userEvent.setup();
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      const usdTab = await screen.findByRole("tab", { name: "USD" });
      await user.click(usdTab);

      expect(await screen.findByText("TRANSPORTE")).toBeInTheDocument();
    });
  });

  describe("single currency — no tabs", () => {
    it("does not render tabs when only one currency", async () => {
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json(mockSummaryOneMoneda),
        ),
      );

      render(<MonthlySummary />, { wrapper: makeWrapper() });

      // Wait for data to load — the category strip is unique when single currency
      await screen.findByText("HOGAR");
      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    });

    it("shows KPI cards directly without tabs", async () => {
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json(mockSummaryOneMoneda),
        ),
      );

      render(<MonthlySummary />, { wrapper: makeWrapper() });

      await screen.findByText("HOGAR");
      expect(screen.getAllByText("Ingresado").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Gastado").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Diferencia").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("category strip", () => {
    it("shows top spending category", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      expect(await screen.findByText("HOGAR")).toBeInTheDocument();
      expect(await screen.findByText("Mayor gasto del mes:")).toBeInTheDocument();
    });

    it("does not show category strip when topSpendingCategory is null", async () => {
      const noCategory: WorkspaceSummary = {
        ...mockSummaryOneMoneda,
        perCurrency: [{ ...mockSummaryOneMoneda.perCurrency[0], topSpendingCategory: null }],
      };
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json(noCategory),
        ),
      );

      render(<MonthlySummary />, { wrapper: makeWrapper() });

      // Wait for data — use the Total USD section as anchor (always present)
      await screen.findByText(/total en usd/i);
      expect(screen.queryByText("Mayor gasto del mes:")).not.toBeInTheDocument();
    });
  });

  describe("total en USD", () => {
    it("renders the Total en USD section", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      expect(await screen.findByText(/total en usd/i)).toBeInTheDocument();
    });

    it("displays the ingresado USD value", async () => {
      render(<MonthlySummary />, { wrapper: makeWrapper() });

      // 1383.08 formatted as es-AR
      await waitFor(() => {
        expect(screen.getByText("USD 1.383,08")).toBeInTheDocument();
      });
    });
  });

  describe("empty state", () => {
    it("renders nothing when perCurrency is empty", async () => {
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json({ ...mockSummary, perCurrency: [] }),
        ),
      );

      const { container } = render(<MonthlySummary />, { wrapper: makeWrapper() });

      // Esperar a que resuelva la query (deja de haber skeleton) antes de afirmar que no renderiza nada
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });
  });

  describe("currency symbol", () => {
    const cardOf = (title: string) =>
      screen.getAllByText(title)[0].closest(".ant-card") as HTMLElement;

    it("uses the real currency code in KPIs and deltas, never a bare $", async () => {
      const eur: WorkspaceSummary = {
        ...mockSummaryOneMoneda,
        perCurrency: [{ ...mockSummaryOneMoneda.perCurrency[0], currency: "EUR" }],
      };
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json(eur),
        ),
      );
      const { container } = render(<MonthlySummary />, { wrapper: makeWrapper() });
      await screen.findByText("HOGAR");

      expect(within(cardOf("Ingresado")).getByText("EUR 50.000 más que el mes pasado")).toBeInTheDocument();
      expect(
        cardOf("Diferencia").querySelector(".ant-statistic-content-prefix")?.textContent,
      ).toBe("EUR ");
      expect(container.textContent).not.toContain("$");
    });
  });

  describe("number format", () => {
    it.each(["ARS", "EUR", "USD"])(
      "renders %s KPI values in es-AR, with the sign before the code",
      async (code) => {
        const summary: WorkspaceSummary = {
          ...mockSummaryOneMoneda,
          perCurrency: [
            {
              ...mockSummaryOneMoneda.perCurrency[0],
              currency: code,
              totalIncome: 5018.05,
              totalSpent: 5634.51,
              net: -616.46,
            },
          ],
        };
        server.use(
          http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
            HttpResponse.json(summary),
          ),
        );
        render(<MonthlySummary />, { wrapper: makeWrapper() });
        await screen.findByText("HOGAR");

        const text = (title: string) =>
          screen
            .getByText(title)
            .closest(".ant-card")!
            .querySelector(".ant-statistic-content")!.textContent;
        expect(text("Ingresado")).toBe(`${code} 5.018,05`);
        expect(text("Gastado")).toBe(`-${code} 5.634,51`);
        expect(text("Diferencia")).toBe(`-${code} 616,46`);
      },
    );
  });

  describe("error state", () => {
    it("shows an error message when the request fails", async () => {
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () =>
          HttpResponse.json({ message: "Error" }, { status: 500 }),
        ),
      );

      render(<MonthlySummary />, { wrapper: makeWrapper() });

      expect(
        await screen.findByText("No se pudo cargar el resumen mensual."),
      ).toBeInTheDocument();
    });

    it("offers a retry button that refetches and recovers", async () => {
      let calls = 0;
      server.use(
        http.get("http://localhost:8080/workspaces/:workspaceId/summary/monthly", () => {
          calls += 1;
          return calls === 1
            ? HttpResponse.json({ message: "Error" }, { status: 500 })
            : HttpResponse.json(mockSummaryOneMoneda);
        }),
      );

      render(<MonthlySummary />, { wrapper: makeWrapper() });
      const retry = await screen.findByRole("button", { name: "Reintentar" });
      await userEvent.click(retry);

      expect(await screen.findByText("HOGAR")).toBeInTheDocument();
      expect(calls).toBe(2);
    });
  });

  describe("no default workspace", () => {
    it("renders nothing when DEFAULT_WORKSPACE is null (nothing to summarize)", async () => {
      server.use(
        http.get("http://localhost:8080/settings/defaults/DEFAULT_WORKSPACE", () =>
          HttpResponse.json({ key: "DEFAULT_WORKSPACE", value: null }),
        ),
      );

      const { container } = render(<MonthlySummary />, { wrapper: makeWrapper() });

      // workspaceId es null → la query queda deshabilitada y no hay nada que resumir
      await waitFor(() => {
        expect(container).toBeEmptyDOMElement();
      });
    });
  });
});

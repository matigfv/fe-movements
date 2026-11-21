import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import dayjs from "dayjs";
import "dayjs/locale/es";
import { theme } from "antd";
import TopCategories from "@/components/home/TopCategories";
import { getChartColors } from "@/utils/chartTheme";
import { buildCategoryColorMap } from "@/utils/categoryColor";
import type { BalanceByCategory } from "@/models/BalanceByCategory";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockBalanceData: BalanceByCategory[] = [
  {
    category: "Vivienda",
    year: 2026,
    currencySymbol: "ARS",
    total: 50000,
  },
  {
    category: "Alimentación",
    year: 2026,
    currencySymbol: "ARS",
    total: 30000,
  },
  {
    category: "Transporte",
    year: 2026,
    currencySymbol: "ARS",
    total: 20000,
  },
  {
    category: "Entretenimiento",
    year: 2026,
    currencySymbol: "ARS",
    total: 15000,
  },
  {
    category: "Salud",
    year: 2026,
    currencySymbol: "ARS",
    total: 10000,
  },
  {
    category: "Educación",
    year: 2026,
    currencySymbol: "ARS",
    total: 5000,
  },
];

const mockCurrencies = [
  { id: "1", symbol: "ARS", name: "Peso Argentino" },
  { id: "2", symbol: "USD", name: "Dólar" },
];

const mockUserDefault = { value: "1" };

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("TopCategories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("muestra skeleton mientras carga los datos", () => {
    server.use(
      http.get("*/balance/category", () => {
        return new Promise(() => {}); // Never resolves
      }),
      http.get("*/currencies", () => HttpResponse.json(mockCurrencies)),
      http.get("*/settings/default/DEFAULT_CURRENCY", () =>
        HttpResponse.json(mockUserDefault),
      ),
    );

    renderWithProviders(<TopCategories />);

    expect(screen.getByText("Top Categorías del Mes")).toBeInTheDocument();
  });

  it("muestra la moneda y el mes en el encabezado", async () => {
    server.use(
      http.get("*/balance/category", () => HttpResponse.json(mockBalanceData)),
      http.get("*/currencies", () => HttpResponse.json(mockCurrencies)),
      http.get("*/settings/default/DEFAULT_CURRENCY", () =>
        HttpResponse.json(mockUserDefault),
      ),
    );

    renderWithProviders(<TopCategories />);

    const month = dayjs().locale("es").format("MMMM YYYY");
    expect(await screen.findByText(`ARS · ${month}`)).toBeInTheDocument();
  });

  it("muestra mensaje cuando no hay datos", async () => {
    server.use(
      http.get("*/balance/category", () => HttpResponse.json([])),
      http.get("*/currencies", () => HttpResponse.json(mockCurrencies)),
      http.get("*/settings/default/DEFAULT_CURRENCY", () =>
        HttpResponse.json(mockUserDefault),
      ),
    );

    renderWithProviders(<TopCategories />);

    await waitFor(() => {
      expect(
        screen.getByText("Sin gastos registrados este mes"),
      ).toBeInTheDocument();
    });
  });

  it("muestra top 5 categorías con mayor gasto", async () => {
    server.use(
      http.get("*/balance/category", () =>
        HttpResponse.json(mockBalanceData),
      ),
      http.get("*/currencies", () => HttpResponse.json(mockCurrencies)),
      http.get("*/settings/default/DEFAULT_CURRENCY", () =>
        HttpResponse.json(mockUserDefault),
      ),
    );

    renderWithProviders(<TopCategories />);

    await waitFor(() => {
      expect(screen.getByText(/Vivienda/)).toBeInTheDocument();
      expect(screen.getByText(/Alimentación/)).toBeInTheDocument();
      expect(screen.getByText(/Transporte/)).toBeInTheDocument();
      expect(screen.getByText(/Entretenimiento/)).toBeInTheDocument();
      expect(screen.getByText(/Salud/)).toBeInTheDocument();
    });

    // No debe mostrar la 6ta categoría (Educación)
    expect(screen.queryByText(/Educación/)).not.toBeInTheDocument();
  });

  it("muestra montos y porcentajes correctamente", async () => {
    server.use(
      http.get("*/balance/category", () =>
        HttpResponse.json(mockBalanceData),
      ),
      http.get("*/currencies", () => HttpResponse.json(mockCurrencies)),
      http.get("*/settings/default/DEFAULT_CURRENCY", () =>
        HttpResponse.json(mockUserDefault),
      ),
    );

    renderWithProviders(<TopCategories />);

    await waitFor(() => {
      // Vivienda: 50000 / (50000+30000+20000+15000+10000) = 40%
      expect(screen.getByText(/ARS 50\.000/)).toBeInTheDocument();
      expect(screen.getByText(/\(40\.0%\)/)).toBeInTheDocument();
    });
  });

  it("usa el código de la moneda activa en vez de un $ fijo", async () => {
    server.use(
      http.get("*/balance/category", () => HttpResponse.json(mockBalanceData)),
      http.get("*/currencies", () =>
        HttpResponse.json([{ id: "3", symbol: "EUR", name: "Euro" }]),
      ),
      http.get("*/settings/defaults/DEFAULT_CURRENCY", () =>
        HttpResponse.json({ value: "3" }),
      ),
    );

    renderWithProviders(<TopCategories />);

    expect(await screen.findByText("EUR 50.000")).toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });

  it("colors each dot by category name, matching the donut", async () => {
    server.use(
      http.get("*/balance/category", () => HttpResponse.json(mockBalanceData)),
      http.get("*/currencies", () => HttpResponse.json(mockCurrencies)),
      http.get("*/settings/default/DEFAULT_CURRENCY", () =>
        HttpResponse.json(mockUserDefault),
      ),
    );

    renderWithProviders(<TopCategories />);

    const palette = getChartColors(theme.getDesignToken());
    await screen.findByText("Vivienda");
    const items = screen.getAllByRole("listitem");
    const normalize = (c: string) => {
      const el = document.createElement("i");
      el.style.backgroundColor = c;
      return el.style.backgroundColor;
    };
    const names = ["Vivienda", "Alimentación", "Transporte", "Entretenimiento", "Salud"];
    // Same map the donut builds from the full list (6 categories, including Educación).
    const map = buildCategoryColorMap([...names, "Educación"], palette);
    expect(new Set(names.map((n) => map[n])).size).toBe(5);
    items.forEach((li, i) => {
      const dot = li.querySelector<HTMLElement>("div > div > div");
      expect(dot?.style.backgroundColor).toBe(normalize(map[names[i]]));
    });
  });

  it("ordena categorías por total descendente", async () => {
    const unorderedData = [
      {
        category: "C",
        year: 2026,
        currencySymbol: "ARS",
        total: 10000,
      },
      {
        category: "A",
        year: 2026,
        currencySymbol: "ARS",
        total: 30000,
      },
      {
        category: "B",
        year: 2026,
        currencySymbol: "ARS",
        total: 20000,
      },
    ];

    server.use(
      http.get("*/balance/category", () => HttpResponse.json(unorderedData)),
      http.get("*/currencies", () => HttpResponse.json(mockCurrencies)),
      http.get("*/settings/default/DEFAULT_CURRENCY", () =>
        HttpResponse.json(mockUserDefault),
      ),
    );

    renderWithProviders(<TopCategories />);

    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      expect(items[0]).toHaveTextContent("A");
      expect(items[1]).toHaveTextContent("B");
      expect(items[2]).toHaveTextContent("C");
    });
  });
});

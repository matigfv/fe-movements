import { describe, it, expect, beforeAll, afterEach, afterAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import ItemPriceHistoryPopover from "@/components/movements/tables/ItemPriceHistoryPopover";

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPopover() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ItemPriceHistoryPopover description="Papa" />
    </QueryClientProvider>,
  );
}

describe("ItemPriceHistoryPopover", () => {
  it("muestra la variación y los precios al abrirse", async () => {
    server.use(
      http.get("http://localhost:8080/expenses/items/price-history", ({ request }) => {
        expect(new URL(request.url).searchParams.get("description")).toBe("Papa");
        return HttpResponse.json([
          {
            unit: "KILOGRAMO",
            currency: "ARS",
            variationPercent: 24,
            points: [
              { date: "2026-01-10", unitPrice: 500 },
              { date: "2026-03-10", unitPrice: 620 },
            ],
          },
        ]);
      }),
    );
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByLabelText("Ver historial de precios"));

    await waitFor(() => expect(screen.getByText("+24%")).toBeInTheDocument());
    expect(screen.getByText("$620.00")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay historial", async () => {
    server.use(
      http.get("http://localhost:8080/expenses/items/price-history", () => HttpResponse.json([])),
    );
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByLabelText("Ver historial de precios"));

    await waitFor(() => expect(screen.getByText("Sin historial de precios")).toBeInTheDocument());
  });
});

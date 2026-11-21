import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse, delay } from "msw";
import { setupServer } from "msw/node";
import { useState, type ReactNode } from "react";
import { App as AntdApp } from "antd";
import type { Movement } from "@/models/Movement";
import type { PageResponse } from "@/models/BaseMode";
import type { MovementFilters } from "@/routes/movements";
import { TypeEnum } from "@/enums/TypeEnum";
import MovementTable from "@/components/movements/tables/MovementTable";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/apis/websocket/WebSocketProvider", () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: false,
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),
}));

vi.mock("@/apis/hooks/useWorkspaces", () => ({
  useWorkspaces: vi.fn(() => ({ data: [], isSuccess: true })),
}));

// Reemplaza el hook de borrado deshacible por una versión síncrona (sin
// esperar los 7s reales) que sigue siendo reactiva (isPending refleja el
// estado inmediatamente tras requestDelete/requestDeleteMany), y expone spies
// para verificar con qué argumentos se la invoca.
const requestDeleteSpy = vi.fn();
const requestDeleteManySpy = vi.fn();

vi.mock("@/utils/useUndoableDelete", () => ({
  useUndoableDelete: () => {
    const [pending, setPending] = useState<Set<number>>(new Set());
    const requestDelete = (id: number) => {
      requestDeleteSpy(id);
      setPending((prev) => new Set(prev).add(id));
    };
    const requestDeleteMany = (ids: number[]) => {
      requestDeleteManySpy(ids);
      setPending((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.add(id));
        return next;
      });
    };
    return {
      requestDelete,
      requestDeleteMany,
      isPending: (id: number) => pending.has(id),
    };
  },
}));

// ── Fixtures ────────────────────────────────────────────────────────────────

const defaultFilters: MovementFilters = {
  description: null,
  type: [],
  bank: [],
  categories: [],
  isLive: true,
  currency: [],
};

function makeMovement(id: number): Movement {
  return {
    id,
    amount: 500,
    description: `Movimiento ${id}`,
    date: "2026-01-15",
    createdAt: "2026-01-15T10:00:00",
    updatedAt: "2026-01-15T10:00:00",
    bank: "GALICIA",
    categories: [],
    currency: { id: 1, symbol: "ARS", description: "Peso argentino" },
    type: TypeEnum.DEBITO,
    cuotasTotales: null,
    cuotaActual: null,
    metadata: {
      owner: { id: 1, givenName: "Test" },
      workspace: { id: 10, name: "Familia" },
      exchangeRate: 1,
      amountUsd: null,
    },
    items: [],
  };
}

function makePageResponse(movements: Movement[]): PageResponse<Movement> {
  return {
    content: movements,
    totalElements: movements.length,
    totalPages: movements.length === 0 ? 0 : 1,
    size: 25,
    number: 0,
    first: true,
    last: true,
  };
}

// ── MSW server ─────────────────────────────────────────────────────────────

const emptyPageResponse = makePageResponse([]);
const filledPageResponse = makePageResponse([makeMovement(1), makeMovement(2)]);

const server = setupServer(
  http.get("http://localhost:8080/expenses", () =>
    HttpResponse.json(emptyPageResponse),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AntdApp>{children}</AntdApp>
    </QueryClientProvider>
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("MovementTable", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("empty state", () => {
    beforeEach(() => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(emptyPageResponse),
        ),
      );
    });

    it("shows the first-movement CTA instead of the list when there are no movements and no active filters", async () => {
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getByText("¿Empezamos?")).toBeInTheDocument(),
      );
      expect(
        screen.getByRole("button", { name: /Cargar mi primer movimiento/ }),
      ).toBeInTheDocument();
      expect(screen.queryByText("Sin movimientos")).not.toBeInTheDocument();
    });

    it("shows 'Sin movimientos' (not the CTA) when a filter is active and returns no results", async () => {
      render(
        <MovementTable filters={{ ...defaultFilters, description: "no existe" }} />,
        { wrapper: makeWrapper() },
      );

      await waitFor(() =>
        expect(screen.getAllByText("Sin movimientos").length).toBeGreaterThan(0),
      );
      expect(screen.queryByText("¿Empezamos?")).not.toBeInTheDocument();
    });
  });

  describe("with movements", () => {
    beforeEach(() => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(filledPageResponse),
        ),
      );
    });

    it("renders movement rows when the API returns data", async () => {
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0),
      );
      expect(screen.queryByText("Sin movimientos")).not.toBeInTheDocument();
    });

    it("renders the correct number of movement entries", async () => {
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getAllByText(/Movimiento \d/).length).toBeGreaterThanOrEqual(2),
      );
    });
  });

  describe("row styling", () => {
    const rowOf = (text: string) =>
      screen.getAllByText(text)[0].closest(".ant-card") as HTMLElement;

    it("no longer tints the whole row nor uses a colored side stripe, just a neutral border", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(
            makePageResponse([
              { ...makeMovement(1), type: TypeEnum.DEBITO },
              { ...makeMovement(2), type: TypeEnum.INGRESO },
            ]),
          ),
        ),
      );
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });
      await waitFor(() => expect(screen.getAllByText("Movimiento 1").length).toBeGreaterThan(0));

      for (const text of ["Movimiento 1", "Movimiento 2"]) {
        const style = rowOf(text).getAttribute("style") ?? "";
        expect(style).not.toMatch(/rojo-falta-pago|verde-pagado|#ffe6e6|#f0fff0/);
        expect(style).toMatch(/border:\s*1px solid/);
        expect(style).not.toMatch(/border-left/);
      }
    });

    it("renders the type indicator as a 24px circular badge", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(makePageResponse([{ ...makeMovement(8), type: TypeEnum.INGRESO }])),
        ),
      );
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });
      await waitFor(() => expect(screen.getAllByText("Movimiento 8").length).toBeGreaterThan(0));

      const badge = screen.getByRole("img", { name: "Ingreso" });
      expect(badge.style.width).toBe("24px");
      expect(badge.style.height).toBe("24px");
      expect(badge.style.borderRadius).toBe("50%");
    });

    it.each([
      [TypeEnum.DEBITO, "Débito"],
      [TypeEnum.CREDITO, "Crédito"],
      [TypeEnum.INGRESO, "Ingreso"],
      [TypeEnum.REINTEGRO, "Reintegro"],
    ])("shows a type indicator with an accessible name for %s", async (type, label) => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(makePageResponse([{ ...makeMovement(7), type }])),
        ),
      );
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });
      await waitFor(() => expect(screen.getAllByText("Movimiento 7").length).toBeGreaterThan(0));

      expect(screen.getByRole("img", { name: label })).toBeInTheDocument();
    });

    it("renders a signed, semibold amount with tabular numerals", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(
            makePageResponse([
              { ...makeMovement(1), type: TypeEnum.DEBITO },
              { ...makeMovement(2), type: TypeEnum.INGRESO },
            ]),
          ),
        ),
      );
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });
      await waitFor(() => expect(screen.getAllByText("Movimiento 1").length).toBeGreaterThan(0));

      const debit = screen.getByText(/-\s?\$500\.00/);
      const income = screen.getByText(/\+\s?\$500\.00/);
      for (const el of [debit, income]) {
        expect(el.getAttribute("style")).toMatch(/font-weight:\s*600/);
        expect(el.getAttribute("style")).toMatch(/tabular-nums/);
      }
      expect(debit.style.color).not.toBe(income.style.color);
    });

    it("renders the currency as a neutral tag, not a blue one", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () => HttpResponse.json(filledPageResponse)),
      );
      const { container } = render(<MovementTable filters={defaultFilters} />, {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(screen.getAllByText("Movimiento 1").length).toBeGreaterThan(0));

      expect(screen.getAllByText("ARS").length).toBeGreaterThan(0);
      expect(container.querySelector(".ant-tag-blue")).not.toBeInTheDocument();
    });
  });

  describe("row entrance", () => {
    const rows = (container: HTMLElement) =>
      Array.from(container.querySelectorAll(".ant-card .ant-card")) as HTMLElement[];

    it("never uses the sliding step-enter-right class on rows", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () => HttpResponse.json(filledPageResponse)),
      );
      const { container } = render(<MovementTable filters={defaultFilters} />, {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(screen.getAllByText("Movimiento 1").length).toBeGreaterThan(0));

      expect(container.querySelector(".step-enter-right")).toBeNull();
      expect(rows(container).some((r) => r.style.animationDelay)).toBe(false);
    });

    it("fades rows in on the first load only, not after the filters change", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", ({ request }) => {
          const hasFilter = new URL(request.url).searchParams.has("description");
          return HttpResponse.json(
            hasFilter ? makePageResponse([makeMovement(9)]) : filledPageResponse,
          );
        }),
      );
      const { container, rerender } = render(<MovementTable filters={defaultFilters} />, {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(screen.getAllByText("Movimiento 1").length).toBeGreaterThan(0));
      expect(container.querySelector(".list-row-enter")).not.toBeNull();

      await waitFor(() => expect(container.querySelector(".list-row-enter")).toBeNull());

      rerender(<MovementTable filters={{ ...defaultFilters, description: "x" }} />);
      await waitFor(() => expect(screen.getAllByText("Movimiento 9").length).toBeGreaterThan(0));
      expect(container.querySelector(".list-row-enter")).toBeNull();
    });
  });

  describe("desglose (acordeón)", () => {
    const movementWithItems: Movement = {
      ...makeMovement(3),
      items: [{ id: 1, quantity: 1, unit: "KILOGRAMO", description: "Papa", price: 500 }],
    };

    it("despliega el desglose al hacer click en cualquier parte de la card, no solo en la flecha", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(makePageResponse([movementWithItems])),
        ),
      );
      const user = userEvent.setup();
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getAllByText("Movimiento 3").length).toBeGreaterThan(0),
      );
      expect(screen.queryByText("Papa")).not.toBeInTheDocument();

      await user.click(screen.getAllByText("Movimiento 3")[0]);

      await waitFor(() => expect(screen.getByText("Papa")).toBeInTheDocument());
    });

    it("un movimiento sin items no muestra ninguna flecha de desglose ni reacciona con contenido extra al click", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(filledPageResponse),
        ),
      );
      const user = userEvent.setup();
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0),
      );
      await user.click(screen.getAllByText(/Movimiento 1/)[0]);
      expect(screen.queryByText("Total")).not.toBeInTheDocument();
    });
  });

  describe("repetir compra", () => {
    const movementWithItems: Movement = {
      ...makeMovement(5),
      categories: [{ id: 1, description: "Supermercado", isActive: true, isDeletable: false }],
      items: [{ id: 9, quantity: 2, unit: "KILOGRAMO", description: "Papa", price: 800 }],
    };

    it("crea un movimiento nuevo con la fecha de hoy y el mismo desglose", async () => {
      let posted: Record<string, unknown> | null = null;
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(makePageResponse([movementWithItems])),
        ),
        http.post("http://localhost:8080/expenses", async ({ request }) => {
          posted = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json({ id: 99 }, { status: 201 });
        }),
      );
      const user = userEvent.setup();
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getAllByLabelText("Más acciones").length).toBeGreaterThan(0),
      );
      await user.click(screen.getAllByLabelText("Más acciones")[0]);
      await user.click(await screen.findByRole("menuitem", { name: /Repetir/ }));

      await waitFor(() => expect(posted).not.toBeNull());
      expect(posted).toMatchObject({
        description: "Movimiento 5",
        amount: 500,
        categories: [{ description: "Supermercado" }],
        items: [{ quantity: 2, unit: "KILOGRAMO", description: "Papa", price: 800 }],
      });
      expect(posted!.date).toBe(new Date().toLocaleDateString("sv-SE"));
    });

    it("no ofrece repetir un movimiento en cuotas (CREDITO)", async () => {
      const user = userEvent.setup();
      server.use(
        http.get("http://localhost:8080/expenses", () =>
          HttpResponse.json(
            makePageResponse([{ ...makeMovement(6), type: TypeEnum.CREDITO, cuotaActual: 1, cuotasTotales: 3 }]),
          ),
        ),
      );
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getAllByText(/Movimiento 6/).length).toBeGreaterThan(0),
      );
      await user.click(screen.getAllByLabelText("Más acciones")[0]);
      await screen.findByRole("menuitem", { name: /Eliminar/ });
      expect(screen.queryByRole("menuitem", { name: /Repetir/ })).not.toBeInTheDocument();
    });
  });

  describe("estado de carga", () => {
    it("muestra un spinner en vez del CTA o la tabla mientras carga", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", async () => {
          await delay(50);
          return HttpResponse.json(filledPageResponse);
        }),
      );

      const { container } = render(<MovementTable filters={defaultFilters} />, {
        wrapper: makeWrapper(),
      });

      expect(container.querySelector(".ant-spin")).toBeInTheDocument();
      expect(screen.queryByText("¿Empezamos?")).not.toBeInTheDocument();
      expect(screen.queryByText(/Movimiento 1/)).not.toBeInTheDocument();

      await waitFor(() =>
        expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0),
      );
      expect(container.querySelector(".ant-spin")).not.toBeInTheDocument();
    });

    it("notifica onStateChange con hasMovements=true cuando hay movimientos", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () => HttpResponse.json(filledPageResponse)),
      );
      const onStateChange = vi.fn();

      render(<MovementTable filters={defaultFilters} onStateChange={onStateChange} />, {
        wrapper: makeWrapper(),
      });

      expect(onStateChange).toHaveBeenCalledWith({ isLoading: true, hasMovements: false });

      await waitFor(() =>
        expect(onStateChange).toHaveBeenCalledWith({ isLoading: false, hasMovements: true }),
      );
    });

    it("notifica onStateChange con hasMovements=false cuando la cuenta no tiene movimientos", async () => {
      server.use(
        http.get("http://localhost:8080/expenses", () => HttpResponse.json(emptyPageResponse)),
      );
      const onStateChange = vi.fn();

      render(<MovementTable filters={defaultFilters} onStateChange={onStateChange} />, {
        wrapper: makeWrapper(),
      });

      await waitFor(() =>
        expect(onStateChange).toHaveBeenCalledWith({ isLoading: false, hasMovements: false }),
      );
    });
  });

  describe("select all", () => {
    beforeEach(() => {
      server.use(
        http.get("http://localhost:8080/expenses", () => HttpResponse.json(filledPageResponse)),
      );
    });

    it("selects every visible row, then clears them on a second click", async () => {
      const user = userEvent.setup();
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });
      await waitFor(() => expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0));

      const all = screen.getByRole("checkbox", { name: "Seleccionar todos" });
      await user.click(all);
      expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
      expect(all).toBeChecked();

      await user.click(all);
      expect(screen.queryByText(/seleccionados/)).not.toBeInTheDocument();
    });

    it("shows the indeterminate state when only some rows are selected and completes the selection", async () => {
      const user = userEvent.setup();
      const { container } = render(<MovementTable filters={defaultFilters} />, {
        wrapper: makeWrapper(),
      });
      await waitFor(() => expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0));

      await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar movimiento" })[0]);
      expect(container.querySelector(".ant-checkbox-indeterminate")).not.toBeNull();

      await user.click(screen.getByRole("checkbox", { name: "Seleccionar todos" }));
      expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
    });

    it("skips rows that are pending removal", async () => {
      const user = userEvent.setup();
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });
      await waitFor(() => expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0));

      await user.click(screen.getAllByRole("checkbox", { name: "Seleccionar movimiento" })[0]);
      await user.click(screen.getByRole("button", { name: "Eliminar" }));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
      await waitFor(() => expect(requestDeleteManySpy).toHaveBeenCalledWith([1]));

      await user.click(screen.getByRole("checkbox", { name: "Seleccionar todos" }));
      expect(screen.getByText("1 seleccionados")).toBeInTheDocument();
    });
  });

  describe("borrado en lote", () => {
    beforeEach(() => {
      server.use(
        http.get("http://localhost:8080/expenses", () => HttpResponse.json(filledPageResponse)),
      );
    });

    it("no elimina de inmediato: pide confirmación y usa requestDeleteMany en vez de llamar al DELETE directamente", async () => {
      const user = userEvent.setup();
      render(<MovementTable filters={defaultFilters} />, { wrapper: makeWrapper() });

      await waitFor(() =>
        expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0),
      );

      const [checkbox1] = screen.getAllByRole("checkbox", {
        name: "Seleccionar movimiento",
      });
      await user.click(checkbox1);

      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getAllByText(/¿Eliminar 1 movimientos?/).length).toBeGreaterThan(0);

      expect(requestDeleteManySpy).not.toHaveBeenCalled();

      await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

      await waitFor(() => expect(requestDeleteManySpy).toHaveBeenCalledWith([1]));
    });

    it("atenúa (dimming) las filas seleccionadas apenas se confirma el borrado en lote", async () => {
      const user = userEvent.setup();
      const { container } = render(<MovementTable filters={defaultFilters} />, {
        wrapper: makeWrapper(),
      });

      await waitFor(() =>
        expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0),
      );

      const [checkbox1] = screen.getAllByRole("checkbox", {
        name: "Seleccionar movimiento",
      });
      await user.click(checkbox1);
      await user.click(screen.getByRole("button", { name: "Eliminar" }));

      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

      await waitFor(() => expect(requestDeleteManySpy).toHaveBeenCalled());
      expect(container.querySelector('[style*="opacity: 0.45"]')).toBeInTheDocument();
    });
  });
});

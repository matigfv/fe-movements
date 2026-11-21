import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { App as AntdApp } from "antd";
import type { Movement } from "@/models/Movement";
import type { PageResponse } from "@/models/BaseMode";
import type { MovementFilters } from "@/routes/movements";
import { TypeEnum } from "@/enums/TypeEnum";
import MovementTable from "@/components/movements/tables/MovementTable";

vi.mock("@/apis/websocket/WebSocketProvider", () => ({
  useWebSocket: vi.fn(() => ({ isConnected: false, subscribe: vi.fn(), unsubscribe: vi.fn() })),
}));

vi.mock("@/apis/hooks/useWorkspaces", () => ({
  useWorkspaces: vi.fn(() => ({ data: [], isSuccess: true })),
}));

// The real hook waits 7s before deleting; the bulk delete here only needs to not throw.
vi.mock("@/utils/useUndoableDelete", () => ({
  useUndoableDelete: () => ({
    requestDelete: vi.fn(),
    requestDeleteMany: vi.fn(),
    isPending: () => false,
  }),
}));

// Driving the antd multi-select is not what is under test: confirm straight away.
vi.mock("@/components/movements/tables/BulkCategorizeModal", () => ({
  default: ({ open, onConfirm }: { open: boolean; onConfirm: (c: string[]) => void }) =>
    open ? <button onClick={() => onConfirm(["Super"])}>apply-categorize</button> : null,
}));

const noFilters: MovementFilters = {
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

function page(movements: Movement[]): PageResponse<Movement> {
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

const server = setupServer(
  http.get("http://localhost:8080/expenses", () =>
    HttpResponse.json(page([makeMovement(1), makeMovement(2)])),
  ),
  http.patch("http://localhost:8080/expenses/:id", () => HttpResponse.json({})),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <AntdApp>{children}</AntdApp>
    </QueryClientProvider>
  );
}

async function renderLoaded() {
  const utils = render(<MovementTable filters={noFilters} />, { wrapper });
  await waitFor(() => expect(screen.getAllByText(/Movimiento 1/).length).toBeGreaterThan(0));
  return utils;
}

const selectFirstRow = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getAllByRole("checkbox", { name: "Seleccionar movimiento" })[0]);

describe("bulk toolbar", () => {
  it("is sticky, takes no space in the flow and comes after the rows", async () => {
    const user = userEvent.setup();
    await renderLoaded();
    expect(screen.queryByTestId("bulk-actions-toolbar")).not.toBeInTheDocument();

    await selectFirstRow(user);

    const toolbar = screen.getByTestId("bulk-actions-toolbar");
    expect(toolbar.style.position).toBe("sticky");
    expect(toolbar.style.height).toBe("0px");
    const firstRow = screen.getAllByText(/Movimiento 1/)[0];
    expect(firstRow.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(toolbar).getByRole("button", { name: /Categorizar/ })).toBeInTheDocument();
  });
});

describe("filtered empty state", () => {
  const filtered: MovementFilters = { ...noFilters, bank: ["GALICIA"] };

  it("offers to clear the filters when they hide every movement", async () => {
    server.use(http.get("http://localhost:8080/expenses", () => HttpResponse.json(page([]))));
    const onClearFilters = vi.fn();
    render(<MovementTable filters={filtered} onClearFilters={onClearFilters} />, { wrapper });

    expect(await screen.findByText("Sin movimientos")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Limpiar filtros" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("does not show the clear action in the unfiltered empty state", async () => {
    server.use(http.get("http://localhost:8080/expenses", () => HttpResponse.json(page([]))));
    render(<MovementTable filters={noFilters} onClearFilters={vi.fn()} />, { wrapper });

    expect(await screen.findByText("¿Empezamos?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Limpiar filtros" })).not.toBeInTheDocument();
  });
});

describe("highlight after bulk categorize", () => {
  it("highlights the categorized rows and removes it after about 2 seconds", async () => {
    const user = userEvent.setup();
    const { container } = await renderLoaded();
    await selectFirstRow(user);
    await user.click(screen.getByRole("button", { name: /Categorizar/ }));

    await user.click(screen.getByText("apply-categorize"));
    await waitFor(() => expect(container.querySelectorAll(".row-highlighted")).toHaveLength(1));

    // Fake timers hang msw/axios here, so this waits out the real ~2s timeout.
    await waitFor(() => expect(container.querySelectorAll(".row-highlighted")).toHaveLength(0), {
      timeout: 4000,
    });
  });

  it("does not highlight anything after a bulk delete", async () => {
    const user = userEvent.setup();
    const { container } = await renderLoaded();
    await selectFirstRow(user);
    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));

    await waitFor(() => expect(screen.queryByText(/seleccionados/)).not.toBeInTheDocument());
    expect(container.querySelectorAll(".row-highlighted")).toHaveLength(0);
  });
});

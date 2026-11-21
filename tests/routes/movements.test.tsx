import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect, type ReactNode } from "react";
import type { MovementFilters as MovementFiltersValue } from "@/routes/movements";
import { WorkspaceContext } from "@/apis/workspace/WorkspaceContext";
import type { Workspace } from "@/models/UserWorkspace";

// ── Mocks ──────────────────────────────────────────────────────────────────

let mockTableState: { isLoading: boolean; hasMovements: boolean } = {
  isLoading: true,
  hasMovements: false,
};

vi.mock("@/apis/auth/protectedRouteGuard", () => ({
  protectedRouteGuard: () => () => undefined,
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: { component: ReactNode }) => opts,
}));

type TableProps = { filters: MovementFiltersValue; onClearFilters?: () => void };
const probe: { table: TableProps | null } = { table: null };
let emitFilters: ((f: MovementFiltersValue) => void) | null = null;

vi.mock("@/components/movements/MovementFilters", () => ({
  default: ({ onFiltersChange }: { onFiltersChange: (f: MovementFiltersValue) => void }) => {
    emitFilters = onFiltersChange;
    return <div data-testid="movement-filters">MovementFilters</div>;
  },
}));

vi.mock("@/components/modals/movements/AddMovementModal", () => ({
  default: () => <div data-testid="add-movement-modal">AddMovementModal</div>,
}));

function MockMovementTable(props: {
  filters: MovementFiltersValue;
  onClearFilters?: () => void;
  onStateChange?: (state: { isLoading: boolean; hasMovements: boolean }) => void;
}) {
  const { onStateChange } = props;
  useEffect(() => {
    probe.table = props;
  });
  useEffect(() => {
    onStateChange?.(mockTableState);
  }, [onStateChange]);
  return <div data-testid="movement-table">MovementTable</div>;
}

vi.mock("@/components/movements/tables/MovementTable", () => ({
  default: MockMovementTable,
}));

// ── Import después de mocks ────────────────────────────────────────────────

const { Route } = await import("@/routes/movements");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const RouteComponent = (Route as any).component as React.FC;

import React from "react";

// ── Helpers ────────────────────────────────────────────────────────────────

function renderMovements(workspaceId?: number) {
  const ui = (id?: number) =>
    id === undefined ? (
      <RouteComponent />
    ) : (
      <WorkspaceContext.Provider
        value={{
          currentWorkspace: { workspaceId: id } as Workspace,
          workspaces: [],
          setCurrentWorkspace: () => {},
          isLoading: false,
        }}
      >
        <RouteComponent />
      </WorkspaceContext.Provider>
    );
  const utils = render(ui(workspaceId));
  return { ...utils, switchTo: (id: number) => utils.rerender(ui(id)) };
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  probe.table = null;
  emitFilters = null;
});

describe("Movements route — visibilidad de la barra de filtros", () => {
  it("oculta la barra de filtros mientras el estado de carga es desconocido", async () => {
    mockTableState = { isLoading: true, hasMovements: false };
    renderMovements();

    await waitFor(() => expect(screen.getByTestId("movement-table")).toBeInTheDocument());
    expect(screen.queryByTestId("movement-filters")).not.toBeInTheDocument();
  });

  it("oculta la barra de filtros cuando la cuenta no tiene movimientos", async () => {
    mockTableState = { isLoading: false, hasMovements: false };
    renderMovements();

    await waitFor(() => expect(screen.getByTestId("movement-table")).toBeInTheDocument());
    expect(screen.queryByTestId("movement-filters")).not.toBeInTheDocument();
  });

  it("muestra la barra de filtros cuando hay movimientos", async () => {
    mockTableState = { isLoading: false, hasMovements: true };
    renderMovements();

    await waitFor(() => expect(screen.getByTestId("movement-filters")).toBeInTheDocument());
  });
});

describe("Movements route — filtros por workspace", () => {
  const stored = (bank: string) =>
    JSON.stringify({ type: [], bank: [bank], categories: [], currency: [] });

  it("restaura los filtros guardados del workspace actual", () => {
    mockTableState = { isLoading: false, hasMovements: true };
    window.localStorage.setItem("movements.filters.1", stored("GALICIA"));
    renderMovements(1);
    expect(probe.table?.filters.bank).toEqual(["GALICIA"]);
    expect(probe.table?.filters.description).toBeNull();
    expect(probe.table?.filters.isLive).toBe(true);
  });

  it("al cambiar de workspace carga los filtros de ese workspace", () => {
    mockTableState = { isLoading: false, hasMovements: true };
    window.localStorage.setItem("movements.filters.1", stored("GALICIA"));
    window.localStorage.setItem("movements.filters.2", stored("SANTANDER"));
    const { switchTo } = renderMovements(1);
    expect(probe.table?.filters.bank).toEqual(["GALICIA"]);

    switchTo(2);
    expect(probe.table?.filters.bank).toEqual(["SANTANDER"]);
  });

  it("guarda solo tipo, banco, categorías y moneda (no descripción ni isLive)", async () => {
    mockTableState = { isLoading: false, hasMovements: true };
    renderMovements(1);
    await waitFor(() => expect(emitFilters).not.toBeNull());

    act(() =>
      emitFilters!({
        description: "cafe",
        type: [],
        bank: ["GALICIA"],
        categories: ["Super"],
        currency: ["ARS"],
        isLive: false,
      }),
    );

    expect(JSON.parse(window.localStorage.getItem("movements.filters.1")!)).toEqual({
      type: [],
      bank: ["GALICIA"],
      categories: ["Super"],
      currency: ["ARS"],
    });
    expect(probe.table?.filters.description).toBe("cafe");
  });

  it("no se rompe si localStorage lanza y usa los filtros por defecto", () => {
    mockTableState = { isLoading: false, hasMovements: true };
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    renderMovements(1);
    expect(probe.table?.filters.bank).toEqual([]);
    act(() => emitFilters!({ ...probe.table!.filters, bank: ["GALICIA"] }));
    expect(probe.table?.filters.bank).toEqual(["GALICIA"]);
    get.mockRestore();
    set.mockRestore();
  });

  it("onClearFilters limpia los filtros pero conserva Actuales/Históricos", async () => {
    mockTableState = { isLoading: false, hasMovements: true };
    window.localStorage.setItem("movements.filters.1", stored("GALICIA"));
    renderMovements(1);
    act(() => emitFilters!({ ...probe.table!.filters, description: "cafe", isLive: false }));

    act(() => probe.table!.onClearFilters!());

    expect(probe.table?.filters).toEqual({
      description: null,
      type: [],
      bank: [],
      categories: [],
      currency: [],
      isLive: false,
    });
  });
});

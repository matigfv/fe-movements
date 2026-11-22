import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import type { ReactNode } from "react";
import type {
  FormattedMovement,
  MovementTableViewProps,
} from "@/components/movements/tables/types";
import { TypeEnum } from "@/enums/TypeEnum";
import MovementTableDesktop from "@/components/movements/tables/MovementTableDesktop";
import MovementTableTablet from "@/components/movements/tables/MovementTableTablet";
import MovementTableMobile from "@/components/movements/tables/MovementTableMobile";

vi.mock("@/components/modals/movements/EditMovementModal", () => ({
  default: () => <button aria-label="Editar el movimiento" />,
}));

const SELECT_ALL_NAME = "Seleccionar todos los movimientos de la página";

function makeRecord(id: number): FormattedMovement {
  return {
    id,
    amount: 500,
    description: `Cafe ${id}`,
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
      owner: { id: 1, givenName: "Matias" },
      workspace: { id: 10, name: "Familia" },
      exchangeRate: 1,
      amountUsd: null,
    },
    items: [],
    formattedDate: "15/01/2026",
    currencySymbol: null,
    installments: "-",
    isDebit: true,
    amountColor: "red",
    amountStyle: {},
    typeIndicator: null,
    amountSign: "-",
    isPendingRemoval: false,
  } as FormattedMovement;
}

function makeProps(overrides: Partial<MovementTableViewProps> = {}): MovementTableViewProps {
  return {
    movements: [makeRecord(1), makeRecord(2)],
    onDelete: vi.fn(),
    getCardStyle: () => ({}),
    selectedIds: new Set<number>(),
    onToggleSelect: vi.fn(),
    allSelected: false,
    someSelected: false,
    onToggleSelectAll: vi.fn(),
    expandedIds: new Set<number>(),
    onToggleExpand: vi.fn(),
    animateEntrance: false,
    ...overrides,
  };
}

function renderView(ui: ReactNode) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>{ui}</AntdApp>
    </QueryClientProvider>,
  );
}

describe.each([
  ["desktop", MovementTableDesktop, 8, [1, 2, 2, 3, 7, 2, 4, 3]],
  ["tablet", MovementTableTablet, 7, [1, 3, 2, 3, 8, 3, 4]],
] as const)("%s view", (_name, View, columns, spans) => {
  const spanOf = (el: Element) =>
    Number(Array.from(el.classList).find((c) => c.startsWith("ant-col-"))?.replace("ant-col-", ""));
  const alignOf = (el: Element) => (el as HTMLElement).style.textAlign;

  it("keeps header and body aligned: same scrollbar gutter, spans, alignment and ellipsis", () => {
    renderView(<View {...makeProps()} />);

    const [header, body] = screen.getAllByRole("rowgroup");
    expect(header.getAttribute("style")).toContain("scrollbar-gutter: stable");
    expect(header).toHaveStyle({ overflowY: "hidden" });
    expect(body.getAttribute("style")).toContain("scrollbar-gutter: stable");

    const [headerRow, bodyRow] = screen.getAllByRole("row");
    const headCols = within(headerRow).getAllByRole("columnheader");
    const cells = within(bodyRow).getAllByRole("cell");
    expect(headCols.map(spanOf)).toEqual([...spans]);
    expect(cells.map(spanOf)).toEqual([...spans]);
    expect(spans.reduce((a, b) => a + b, 0)).toBe(24);
    headCols.forEach((h, i) => {
      expect(alignOf(cells[i])).toBe(alignOf(h));
    });
    const textCols = [3, 4];
    textCols.forEach((i) => {
      expect(headCols[i]).toHaveStyle({ paddingInlineEnd: "8px" });
      expect(cells[i]).toHaveStyle({ paddingInlineEnd: "8px" });
    });
    expect(within(bodyRow).getByText("Galicia")).toHaveStyle({
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    });
    expect(within(bodyRow).getByText("Débito")).toHaveStyle({ textOverflow: "ellipsis" });
  });

  it("has no Grupo column or workspace text, keeps the Banco / Tipo column, and shows the loader as a secondary line", () => {
    renderView(<View {...makeProps()} />);

    expect(screen.queryByRole("columnheader", { name: "Grupo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Cargado por" })).not.toBeInTheDocument();
    expect(screen.queryByText("Familia")).not.toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Banco / Tipo" })).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Tipo" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Galicia").length).toBe(2);
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByText("Matias")).toBeInTheDocument();
    expect(within(row).getByText("Cafe 1")).toBeInTheDocument();
  });

  it("shows the type label under the bank in the same cell", () => {
    renderView(<View {...makeProps()} />);

    const row = screen.getAllByRole("row")[1];
    const cell = within(row).getByText("Galicia").closest('[role="cell"]') as HTMLElement;
    expect(within(cell).getByText("Débito")).toBeInTheDocument();
  });

  it("exposes table semantics with matching header and row cell counts", () => {
    renderView(<View {...makeProps()} />);

    expect(screen.getByRole("table", { name: "Movimientos" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(columns);
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(3);
    rows.slice(1).forEach((row) => {
      expect(within(row).getAllByRole("cell")).toHaveLength(columns);
    });
  });

  it("header select-all toggles all rows and has an accessible name", async () => {
    const onToggleSelectAll = vi.fn();
    renderView(<View {...makeProps({ onToggleSelectAll })} />);

    await userEvent.click(screen.getByRole("checkbox", { name: SELECT_ALL_NAME }));
    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it("reflects unchecked, indeterminate and checked states in the header checkbox", () => {
    const { container, rerender } = renderView(<View {...makeProps()} />);
    const box = () => screen.getByRole("checkbox", { name: SELECT_ALL_NAME });

    expect(box()).not.toBeChecked();
    expect(container.querySelector(".ant-checkbox-indeterminate")).toBeNull();

    const wrap = (props: MovementTableViewProps) => (
      <QueryClientProvider client={new QueryClient()}>
        <AntdApp>
          <View {...props} />
        </AntdApp>
      </QueryClientProvider>
    );
    rerender(wrap(makeProps({ someSelected: true, selectedIds: new Set([1]) })));
    expect(box()).not.toBeChecked();
    expect(container.querySelector(".ant-checkbox-indeterminate")).not.toBeNull();

    rerender(
      wrap(makeProps({ allSelected: true, someSelected: true, selectedIds: new Set([1, 2]) })),
    );
    expect(box()).toBeChecked();
    expect(container.querySelector(".ant-checkbox-indeterminate")).toBeNull();
  });
});

describe("mobile view", () => {
  it("shows only who loaded the movement (no group) and a select-all row", async () => {
    const onToggleSelectAll = vi.fn();
    renderView(<MovementTableMobile {...makeProps({ onToggleSelectAll })} />);

    expect(screen.queryByText(/Familia/)).not.toBeInTheDocument();
    expect(screen.getAllByText("Matias").length).toBe(2);

    await userEvent.click(screen.getByRole("checkbox", { name: "Seleccionar todos" }));
    expect(onToggleSelectAll).toHaveBeenCalledTimes(1);
  });

  it("does not render the select-all row when there are no movements", () => {
    renderView(<MovementTableMobile {...makeProps({ movements: [] })} />);

    expect(screen.queryByRole("checkbox", { name: "Seleccionar todos" })).not.toBeInTheDocument();
  });
});

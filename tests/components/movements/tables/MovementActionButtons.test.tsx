import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntdApp } from "antd";
import type { ReactNode } from "react";
import type { FormattedMovement } from "@/components/movements/tables/types";
import { TypeEnum } from "@/enums/TypeEnum";
import MovementActionButtons from "@/components/movements/tables/MovementActionButtons";

vi.mock("@/components/modals/movements/EditMovementModal", () => ({
  default: () => <button aria-label="Editar el movimiento" />,
}));

function makeRecord(overrides: Partial<FormattedMovement> = {}): FormattedMovement {
  return {
    id: 7,
    amount: 500,
    description: "Cafe",
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
    formattedDate: "15/01/2026",
    currencySymbol: null,
    installments: "-",
    isDebit: true,
    amountColor: "red",
    amountStyle: {},
    typeIndicator: null,
    amountSign: "-",
    isPendingRemoval: false,
    ...overrides,
  } as FormattedMovement;
}

function renderButtons(record: FormattedMovement, onDelete = vi.fn()) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AntdApp>{children}</AntdApp>
    </QueryClientProvider>
  );
  render(<MovementActionButtons record={record} onDelete={onDelete} />, { wrapper });
  return onDelete;
}

describe("MovementActionButtons", () => {
  afterEach(() => vi.clearAllMocks());

  it("shows the edit button and an overflow trigger, with repeat/delete hidden until opened", () => {
    renderButtons(makeRecord());

    expect(screen.getByRole("button", { name: "Editar el movimiento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Más acciones" })).toBeInTheDocument();
    expect(screen.queryByText("Repetir")).not.toBeInTheDocument();
    expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
  });

  it("opens a menu with labeled Repetir and Eliminar items", async () => {
    const user = userEvent.setup();
    renderButtons(makeRecord());

    await user.click(screen.getByRole("button", { name: "Más acciones" }));

    expect(await screen.findByRole("menuitem", { name: /Repetir/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Eliminar/ })).toBeInTheDocument();
  });

  it("does not offer Repetir for CREDITO movements", async () => {
    const user = userEvent.setup();
    renderButtons(makeRecord({ type: TypeEnum.CREDITO }));

    await user.click(screen.getByRole("button", { name: "Más acciones" }));

    expect(await screen.findByRole("menuitem", { name: /Eliminar/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Repetir/ })).not.toBeInTheDocument();
  });

  it("asks for confirmation and only deletes after confirming", async () => {
    const user = userEvent.setup();
    const onDelete = renderButtons(makeRecord());

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(await screen.findByRole("menuitem", { name: /Eliminar/ }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByText("¿Eliminar este movimiento?").length).toBeGreaterThan(0);
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(7));
  });

  it("does not delete when the confirmation is cancelled", async () => {
    const user = userEvent.setup();
    const onDelete = renderButtons(makeRecord());

    await user.click(screen.getByRole("button", { name: "Más acciones" }));
    await user.click(await screen.findByRole("menuitem", { name: /Eliminar/ }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancelar" }));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("is operable with the keyboard: Enter opens the menu and Tab moves focus into it", async () => {
    const user = userEvent.setup();
    renderButtons(makeRecord());

    await user.tab();
    await user.tab();
    const trigger = screen.getByRole("button", { name: "Más acciones" });
    expect(trigger).toHaveFocus();

    await user.keyboard("{Enter}");
    const menu = await screen.findByRole("menu");

    // Tab moves focus from the trigger into the open menu (rc-dropdown accessibility hook).
    // Item activation by arrow keys is not asserted: rc-menu skips items without layout in jsdom.
    await user.tab();
    expect(menu).toHaveFocus();
  });
});

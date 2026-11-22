import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import IncomeOnboarding from "@/components/onboarding/IncomeOnboarding";

const withCurrencies = {
  userType: "PERSONAL" as const,
  currenciesToAdd: [{ symbol: "USD", description: "Dólar" }],
};

function renderIncome(props: Partial<React.ComponentProps<typeof IncomeOnboarding>> = {}) {
  const handlers = { onFinish: vi.fn(), onPrev: vi.fn() };
  render(
    <ConfigProvider>
      <IncomeOnboarding initialValues={withCurrencies} {...handlers} {...props} />
    </ConfigProvider>,
  );
  return handlers;
}

describe("IncomeOnboarding hardening", () => {
  it("Volver entrega los valores cargados en el paso", async () => {
    const user = userEvent.setup();
    const h = renderIncome();

    await user.type(screen.getByPlaceholderText("50000"), "1500");
    await user.click(screen.getByText("Volver"));

    expect(h.onPrev).toHaveBeenCalledWith(expect.objectContaining({ amount: 1500 }));
  });

  it("restaura el borrador al volver al paso", () => {
    renderIncome({ draft: { amount: 2300 } });
    expect(screen.getByPlaceholderText("50000")).toHaveValue("2300.00");
  });

  it("no finaliza si hay un monto sin moneda y pide elegirla", async () => {
    const user = userEvent.setup();
    const h = renderIncome();

    await user.type(screen.getByPlaceholderText("50000"), "1500");
    await user.click(screen.getByText("Finalizar"));

    expect(await screen.findByText("Elegí la moneda del ingreso")).toBeInTheDocument();
    expect(h.onFinish).not.toHaveBeenCalled();
  });

  it("finaliza sin ningún campo completado", async () => {
    const user = userEvent.setup();
    const h = renderIncome();

    await user.click(screen.getByText("Finalizar"));

    await waitFor(() => expect(h.onFinish).toHaveBeenCalledTimes(1));
  });

  it("muestra el resumen de lo que se va a crear", () => {
    renderIncome();
    expect(screen.getByText("Se va a crear: 1 workspace · 1 moneda")).toBeInTheDocument();
  });

  it("el resumen concuerda en plural y omite lo que está en cero", () => {
    renderIncome({
      initialValues: {
        userType: "PERSONAL",
        workspacesToAdd: [
          { name: "Familia", isDefault: true },
          { name: "Trabajo", isDefault: false },
        ],
        categoriesToAdd: ["SALUD"],
        banksToAdd: [{ description: "SANTANDER", isDefault: true }],
        currenciesToAdd: [],
      },
    });
    expect(
      screen.getByText("Se va a crear: 2 workspaces · 1 categoría · 1 banco"),
    ).toBeInTheDocument();
  });

  it("con error de envío muestra el aviso y el botón pasa a Reintentar", () => {
    renderIncome({ hasError: true });
    expect(screen.getByText(/No pudimos crear tu cuenta/)).toBeInTheDocument();
    expect(screen.getByText("Reintentar")).toBeInTheDocument();
  });
});

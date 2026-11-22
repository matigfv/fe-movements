import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import type { ComponentProps } from "react";
import ReadyOnboarding from "@/components/onboarding/ReadyOnboarding";

function renderReady(props: Partial<ComponentProps<typeof ReadyOnboarding>> = {}) {
  const handlers = { onFinish: vi.fn(), onCustomize: vi.fn(), onPrev: vi.fn() };
  render(
    <ConfigProvider>
      <ReadyOnboarding initialValues={{ userType: "PERSONAL" }} {...handlers} {...props} />
    </ConfigProvider>,
  );
  return handlers;
}

describe("ReadyOnboarding", () => {
  it("explica qué se crea y define qué es el principal", () => {
    renderReady();
    expect(screen.getByText("Todo listo para empezar")).toBeInTheDocument();
    expect(screen.getByText(/Vamos a crear tu workspace principal/)).toBeInTheDocument();
    expect(screen.getByText(/se usa por defecto al cargar un movimiento/)).toBeInTheDocument();
  });

  it("usa el término del negocio para usuarios Emprendedor", () => {
    renderReady({ initialValues: { userType: "ENTERPRISE" } });
    expect(screen.getByText(/tu espacio de trabajo principal/)).toBeInTheDocument();
  });

  it("Continuar, Personalizar y Volver llaman a su callback", async () => {
    const user = userEvent.setup();
    const h = renderReady();
    await user.click(screen.getByText("Continuar con esto"));
    await user.click(screen.getByText("Personalizar"));
    await user.click(screen.getByText("Volver"));
    expect(h.onFinish).toHaveBeenCalledTimes(1);
    expect(h.onCustomize).toHaveBeenCalledTimes(1);
    expect(h.onPrev).toHaveBeenCalledTimes(1);
  });

  it("con error muestra el aviso y cambia el botón a Reintentar", () => {
    renderReady({ hasError: true });
    expect(screen.getByText(/No pudimos crear tu cuenta/)).toBeInTheDocument();
    expect(screen.getByText("Reintentar")).toBeInTheDocument();
  });
});

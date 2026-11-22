import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import type { ComponentType } from "react";

const finishOnboarding = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (opts: { component: ComponentType }) => opts,
  useRouter: () => ({
    update: vi.fn(),
    navigate: vi.fn(),
    options: { context: { auth: {} } },
  }),
}));
vi.mock("@react-keycloak/web", () => ({
  useKeycloak: () => ({ keycloak: { updateToken: vi.fn() } }),
}));
vi.mock("@/apis/auth/onBoardingGuard", () => ({ onBoardingGuard: () => undefined }));
vi.mock("@/apis/onboarding/OnboardingApi", () => ({
  finishOnboarding: (form: unknown) => finishOnboarding(form),
}));

import { Route } from "@/routes/onboarding";

const Page = (Route as unknown as { component: ComponentType }).component;

function renderPage() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConfigProvider>
        <Page />
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe("onboarding route", () => {
  beforeEach(() => {
    sessionStorage.clear();
    finishOnboarding.mockReset();
  });

  it("el camino corto termina en 'Todo listo' y envía los valores por defecto", async () => {
    finishOnboarding.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Empezar"));
    await user.click(await screen.findByText("Siguiente"));
    await user.click(await screen.findByText("Continuar con esto"));

    await waitFor(() => expect(finishOnboarding).toHaveBeenCalledTimes(1));
    const sent = finishOnboarding.mock.calls[0][0];
    expect(sent.workspacesToAdd).toHaveLength(1);
    expect(sent.workspacesToAdd[0].isDefault).toBe(true);
    expect(sent.userType).toBe("PERSONAL");
  });

  it("si el envío falla muestra el error y permite reintentar", async () => {
    finishOnboarding.mockRejectedValueOnce(new Error("boom")).mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Empezar"));
    await user.click(await screen.findByText("Siguiente"));
    await user.click(await screen.findByText("Continuar con esto"));

    expect(await screen.findByText(/No pudimos crear tu cuenta/)).toBeInTheDocument();
    await user.click(screen.getByText("Reintentar"));
    await waitFor(() => expect(finishOnboarding).toHaveBeenCalledTimes(2));
  });

  it("distingue un rechazo del servidor de un problema de conexión", async () => {
    const serverError = Object.assign(new Error("400"), {
      isAxiosError: true,
      response: { status: 400 },
    });
    finishOnboarding.mockRejectedValueOnce(serverError);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Empezar"));
    await user.click(await screen.findByText("Siguiente"));
    await user.click(await screen.findByText("Continuar con esto"));

    expect(await screen.findByText(/el servidor no aceptó los datos/)).toBeInTheDocument();
  });

  it("Perfil permite volver al inicio", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Empezar"));
    await user.click(await screen.findByText("Volver"));

    expect(await screen.findByText("Empezar")).toBeInTheDocument();
  });

  it("Terminar ahora envía lo cargado desde un paso de personalización", async () => {
    finishOnboarding.mockResolvedValue({});
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Empezar"));
    await user.click(await screen.findByText("Siguiente"));
    await user.click(await screen.findByText("Personalizar"));
    await user.type(await screen.findByPlaceholderText(/Familia, Trabajo/), "Hogar 2");
    await user.click(screen.getByText("Terminar ahora con esto"));

    await waitFor(() => expect(finishOnboarding).toHaveBeenCalledTimes(1));
    expect(finishOnboarding.mock.calls[0][0].workspacesToAdd[0].name).toBe("Hogar 2");
  });

  it("Personalizar suma los pasos de configuración", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByText("Empezar"));
    await user.click(await screen.findByText("Siguiente"));
    await user.click(await screen.findByText("Personalizar"));

    expect(await screen.findByText("Volver")).toBeInTheDocument();
    // jsdom fuerza el layout mobile: el contador reemplaza a la barra de pasos. "Todo listo" no
    // cuenta en Personalizar: Bienvenida, Perfil, 4 de configuración e Ingresos = 7.
    expect(screen.getByText(/Paso 3 de 7/)).toBeInTheDocument();
    expect(screen.queryByText(/Todo listo/)).not.toBeInTheDocument();
  });

  it("restaura el paso y los datos guardados tras un refresh", () => {
    sessionStorage.setItem(
      "onboarding.draft",
      JSON.stringify({
        stepKey: "ready",
        customize: false,
        formData: { userType: "ENTERPRISE" },
        incomeDraft: {},
      }),
    );
    renderPage();
    expect(screen.getByText("Todo listo para empezar")).toBeInTheDocument();
    expect(screen.getByText(/tu espacio de trabajo principal/)).toBeInTheDocument();
  });
});

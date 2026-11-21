import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from "vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import { App as AntdApp, notification, theme } from "antd";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import type { Service, ServiceToUpdate } from "@/models/Service";
import { ServiceCard } from "@/components/services/ServiceCard";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/apis/hooks/useWorkspaces", () => ({
  useWorkspaces: vi.fn(),
}));

vi.mock("@/apis/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { id: 1, email: "test@test.com", userType: "PERSONAL" },
    isLoading: false,
  }),
}));

import { useWorkspaces } from "@/apis/hooks/useWorkspaces";

// ── MSW server ─────────────────────────────────────────────────────────────

const server = setupServer(
  http.delete("http://localhost:8080/subscriptions/:id", () =>
    HttpResponse.json({}, { status: 200 }),
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeService(overrides?: Partial<Service>): Service {
  return {
    id: 1,
    amount: 1500,
    description: "Netflix",
    workspaceName: "Familia",
    workspaceId: 10,
    date: "2026-01-01",
    user: "me@test.com",
    currency: { id: 1, symbol: "ARS", description: "Peso argentino" },
    lastPayment: null,
    isPaid: false,
    ...overrides,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AntdApp>{children}</AntdApp>
    </QueryClientProvider>
  );
}

// Icon-only buttons now carry a descriptive aria-label (accessibility pass).
// The Tooltip title is not reflected in the button role — use the aria-label instead.
const moreBtn = () => screen.getByRole("button", { name: "Más acciones" });
// Opens the "⋯" menu and picks "Editar" (it is a menu item, so the click has to be async).
const clickEdit = async () => {
  await userEvent.click(moreBtn());
  await userEvent.click(await screen.findByRole("menuitem", { name: /Editar/ }));
};
const saveBtn = () => screen.getByRole("button", { name: /guardar/i });
const cancelBtn = () => screen.getByRole("button", { name: /cancelar/i });
const payBtn = () => screen.getByRole("button", { name: /marcar como pagado/i });
const queryPayBtn = () => screen.queryByRole("button", { name: /marcar como pagado/i });
const querySaveBtn = () => screen.queryByRole("button", { name: /guardar/i });

describe("ServiceCard", () => {
  let queryClient: QueryClient;
  let handlePay: ReturnType<typeof vi.fn>;
  let handleUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    handlePay = vi.fn();
    handleUpdate = vi.fn();

    vi.mocked(useWorkspaces).mockReturnValue({
      data: [
        { workspaceId: 10, membershipId: 1, workspaceName: "Familia", role: "ADMIN" },
        { workspaceId: 20, membershipId: 2, workspaceName: "Trabajo", role: "FAMILY" },
      ],
      isSuccess: true,
    } as ReturnType<typeof useWorkspaces>);
  });

  afterEach(async () => {
    vi.clearAllMocks();
    // Static notifications render in their own root; settle them before teardown.
    await act(async () => {
      notification.destroy();
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
  });

  // ── Servicio pendiente (isPaid: false) ────────────────────────────────────

  describe("servicio pendiente (isPaid: false)", () => {
    it("muestra el botón de más acciones", () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(moreBtn()).toBeInTheDocument();
    });

    it("no muestra la etiqueta del workspace ni la del dueño por defecto", () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(screen.queryByText("Familia")).not.toBeInTheDocument();
      expect(screen.queryByText("me@test.com")).not.toBeInTheDocument();
    });

    it("muestra 'Pagado el' con la fecha en un servicio pagado", () => {
      render(
        <ServiceCard
          service={makeService({ isPaid: true, lastPayment: "2026-10-29" })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(screen.getByText(/Pagado el/)).toBeInTheDocument();
      expect(screen.queryByText(/Último pago:/)).not.toBeInTheDocument();
      expect(screen.getByText("29/10/2026")).toBeInTheDocument();
    });

    it("muestra solo la etiqueta del dueño con showOwner", () => {
      render(
        <ServiceCard
          service={makeService()}
          showOwner
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(screen.getByText("me@test.com")).toBeInTheDocument();
      expect(screen.queryByText("Familia")).not.toBeInTheDocument();
    });

    it("muestra 'Último pago:' con la fecha en un servicio pendiente", () => {
      render(
        <ServiceCard
          service={makeService({ lastPayment: "2026-10-29" })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(screen.getByText(/Último pago:/)).toBeInTheDocument();
      expect(screen.getByText("29/10/2026")).toBeInTheDocument();
    });

    it("abre el menú con Editar y Eliminar, también con el teclado", async () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      moreBtn().focus();
      await userEvent.keyboard("{Enter}");

      expect(await screen.findByRole("menuitem", { name: /Editar/ })).toBeInTheDocument();
      expect(screen.getByRole("menuitem", { name: /Eliminar/ })).toBeInTheDocument();
    });

    it("no borra si se cancela la confirmación", async () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await userEvent.click(moreBtn());
      await userEvent.click(await screen.findByRole("menuitem", { name: /Eliminar/ }));
      const dialog = await screen.findByRole("dialog");
      await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));

      // jsdom never finishes the leave animation, so the leave class is the close signal.
      await waitFor(() => expect(dialog).toHaveClass("ant-zoom-leave"));
      expect(screen.queryByText("Netflix eliminado")).not.toBeInTheDocument();
    });

    it("muestra el botón 'Marcar como pagado'", () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(screen.getByRole("button", { name: /marcar como pagado/i })).toBeInTheDocument();
    });

    it("entra en modo edición al hacer click en Editar", async () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();

      expect(saveBtn()).toBeInTheDocument();
      expect(cancelBtn()).toBeInTheDocument();
    });

    it("no muestra 'Marcar como pagado' en modo edición", async () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();

      expect(queryPayBtn()).not.toBeInTheDocument();
    });

    it("cancela la edición y vuelve al estado original", async () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();
      await userEvent.click(cancelBtn());

      expect(payBtn()).toBeInTheDocument();
      expect(querySaveBtn()).not.toBeInTheDocument();
    });
  });

  // ── Formato (S4) ──────────────────────────────────────────────────────────

  describe("formato de monto y fecha", () => {
    const renderWith = (over: Partial<Service>) =>
      render(
        <ServiceCard
          service={makeService(over)}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

    it("muestra el último pago como DD/MM/YYYY", () => {
      renderWith({ lastPayment: new Date(2026, 9, 29) });
      expect(screen.getByText("29/10/2026")).toBeInTheDocument();
    });

    it("acepta un último pago ISO que llega como string", () => {
      renderWith({ lastPayment: "2026-10-29T12:00:00" as unknown as Date });
      expect(screen.getByText("29/10/2026")).toBeInTheDocument();
    });

    it("sin pago previo (o inválido) mantiene el guión", () => {
      renderWith({ lastPayment: null });
      expect(screen.getByText("—")).toBeInTheDocument();
    });

    it("el monto usa dígitos es-AR con 2 decimales y el código como sufijo", () => {
      renderWith({ amount: 1122.5, currency: { id: 2, symbol: "EUR", description: "Euro" } });
      expect(screen.getByTestId("service-amount").textContent).toBe("1.122,50 EUR");
    });
  });

  // ── Colores de estado (S1: sin rojo, neutro + ámbar/verde) ────────────────

  describe("colores de estado", () => {
    const tokens = theme.getDesignToken();
    // jsdom keeps the background shorthand, so compare against a probe element.
    const expectNeutralSurface = (card: HTMLElement) => {
      const probe = document.createElement("div");
      probe.style.background = tokens.colorBgContainer;
      probe.style.borderColor = tokens.colorBorderSecondary;
      expect(card.style.background).toBe(probe.style.background);
      expect(card.style.borderColor).toBe(probe.style.borderColor);
    };
    const renderCard = (isPaid: boolean) =>
      render(
        <ServiceCard
          service={makeService({ isPaid })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

    it("pendiente: etiqueta y monto en ámbar, superficie neutra, sin rojo", () => {
      const { container } = renderCard(false);

      expect(screen.getByTestId("service-status")).toHaveStyle({ color: tokens.orange8 });
      expect(screen.getByTestId("service-amount")).toHaveStyle({ color: tokens.orange8 });
      const card = container.querySelector<HTMLElement>(".ant-card")!;
      expectNeutralSurface(card);
      expect(container.innerHTML).not.toMatch(/ant-tag-(red|error|green|success)|ant-btn-dangerous-outlined/);
      expect(container.querySelectorAll(".ant-tag-has-color")).toHaveLength(0);
    });

    it("pagado: etiqueta en verde, monto secundario, superficie neutra", () => {
      const { container } = renderCard(true);

      expect(screen.getByTestId("service-status")).toHaveStyle({ color: tokens.green8 });
      expect(screen.getByTestId("service-amount")).toHaveStyle({ color: tokens.colorTextSecondary });
      expectNeutralSurface(container.querySelector<HTMLElement>(".ant-card")!);
      expect(container.querySelectorAll(".ant-tag-has-color")).toHaveLength(0);
    });
  });

  // ── Servicio pagado (isPaid: true) ────────────────────────────────────────

  describe("servicio pagado (isPaid: true)", () => {
    it("muestra el botón de editar aunque el servicio esté pagado", () => {
      render(
        <ServiceCard
          service={makeService({ isPaid: true })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(moreBtn()).toBeInTheDocument();
    });

    it("NO muestra el botón 'Marcar como pagado' cuando ya está pagado", () => {
      render(
        <ServiceCard
          service={makeService({ isPaid: true })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      expect(screen.queryByRole("button", { name: /marcar como pagado/i })).not.toBeInTheDocument();
    });

    it("entra en modo edición al hacer click en Editar con servicio pagado", async () => {
      render(
        <ServiceCard
          service={makeService({ isPaid: true })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();

      expect(saveBtn()).toBeInTheDocument();
      expect(cancelBtn()).toBeInTheDocument();
    });

    it("NO muestra 'Marcar como pagado' en modo edición con servicio pagado", async () => {
      render(
        <ServiceCard
          service={makeService({ isPaid: true })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();

      expect(queryPayBtn()).not.toBeInTheDocument();
    });

    it("llama a handleUpdateServiceMutation con los parámetros correctos al guardar", async () => {
      const service = makeService({ isPaid: true, amount: 1500, description: "Netflix" });

      render(
        <ServiceCard
          service={service}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();

      // Cambiar el monto
      const amountInput = screen.getByRole("spinbutton");
      await userEvent.clear(amountInput);
      await userEvent.type(amountInput, "2000");

      await userEvent.click(saveBtn());

      expect(handleUpdate).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ServiceToUpdate>>({
          id: service.id,
          changes: expect.objectContaining({ amount: 2000 }),
        }),
      );
    });

    it("no envía workspace al guardar la edición (el backend usa el workspace activo)", async () => {
      const service = makeService({ isPaid: true, workspaceName: "Familia", workspaceId: 10 });

      render(
        <ServiceCard
          service={service}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();
      await userEvent.click(saveBtn());

      // Verificar que se llamó con los cambios esperados (sin workspace)
      expect(handleUpdate).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ServiceToUpdate>>({
          id: service.id,
          changes: expect.not.objectContaining({ workspace: expect.anything() }),
        }),
      );
    });

    it("cancela la edición de un servicio pagado y vuelve a la vista normal", async () => {
      render(
        <ServiceCard
          service={makeService({ isPaid: true })}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await clickEdit();
      await userEvent.click(cancelBtn());

      // Volvió al estado normal, el botón de editar debe estar de nuevo visible
      expect(moreBtn()).toBeInTheDocument();
      expect(querySaveBtn()).not.toBeInTheDocument();
    });
  });
  // ── Marcar como pagado con deshacer (S3) ──────────────────────────────────

  describe("marcar como pagado con deshacer", () => {
    const renderPending = (delay = 100) =>
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
          undoPayDelayMs={delay}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

    it("muestra el estado pagado enseguida, avisa y no envía el pago todavía", async () => {
      renderPending(2000);

      await userEvent.click(payBtn());

      expect(screen.getByTestId("service-status")).toHaveTextContent("Pagado");
      expect(queryPayBtn()).not.toBeInTheDocument();
      expect(await screen.findByText("Netflix marcado como pagado")).toBeInTheDocument();
      expect(handlePay).not.toHaveBeenCalled();
    });

    it("Deshacer vuelve a pendiente sin enviar ningún pago", async () => {
      renderPending(300);

      await userEvent.click(payBtn());
      await userEvent.click(await screen.findByRole("button", { name: /deshacer/i }));

      expect(screen.getByTestId("service-status")).toHaveTextContent("Pendiente");
      await new Promise((resolve) => setTimeout(resolve, 450));
      expect(handlePay).not.toHaveBeenCalled();
    });

    it("envía exactamente un pago cuando expira la ventana", async () => {
      const service = makeService();
      render(
        <ServiceCard
          service={service}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
          undoPayDelayMs={100}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await userEvent.click(payBtn());

      await waitFor(() => expect(handlePay).toHaveBeenCalledTimes(1));
      expect(handlePay).toHaveBeenCalledWith(service);
    });

    it("envía el pago de inmediato si la tarjeta se desmonta durante la ventana", async () => {
      const { unmount } = renderPending(5000);

      await userEvent.click(payBtn());
      unmount();

      expect(handlePay).toHaveBeenCalledTimes(1);
    });

    it("si el pago falla, la tarjeta vuelve a pendiente", async () => {
      handlePay.mockRejectedValue(new Error("boom"));
      renderPending(50);

      await userEvent.click(payBtn());

      await waitFor(() => expect(handlePay).toHaveBeenCalledTimes(1));
      await waitFor(() =>
        expect(screen.getByTestId("service-status")).toHaveTextContent("Pendiente"),
      );
      expect(payBtn()).toBeInTheDocument();
    });
  });
  // Last on purpose: the undo notification it triggers outlives jsdom's exit animation.
  describe("eliminar", () => {
    it("pide confirmación centrada y borra solo tras confirmar", async () => {
      render(
        <ServiceCard
          service={makeService()}
          handlePayServiceMutation={handlePay}
          handleUpdateServiceMutation={handleUpdate}
        />,
        { wrapper: makeWrapper(queryClient) },
      );

      await userEvent.click(moreBtn());
      await userEvent.click(await screen.findByRole("menuitem", { name: /Eliminar/ }));

      const dialog = await screen.findByRole("dialog");
      expect(document.querySelector(".ant-modal-centered")).not.toBeNull();
      expect(within(dialog).getByText(/deshacerlo durante unos segundos/i)).toBeInTheDocument();
      expect(screen.queryByText("Netflix eliminado")).not.toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole("button", { name: "Eliminar" }));
      expect(await screen.findByText("Netflix eliminado")).toBeInTheDocument();
    });
  });
});

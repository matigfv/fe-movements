import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import type { BankRecord } from "@/models/Bank";
import type { UserSetting } from "@/models/UserSetting";
import { SettingBank } from "@/components/settings/SettingBank";

// ── Mock useCurrentUser ────────────────────────────────────────────────────
vi.mock("@/apis/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { id: 1, email: "test@test.com", userType: "PERSONAL" },
    isLoading: false,
  }),
}));

// ── MSW server ─────────────────────────────────────────────────────────────

const mockBanks: BankRecord[] = [
  { id: 1, description: "GALICIA" },
  { id: 2, description: "SANTANDER" },
];

const defaultBankSetting: UserSetting = { key: "DEFAULT_BANK", value: 1 };
const newBank: BankRecord = { id: 3, description: "NACION" };

const server = setupServer(
  http.get("http://localhost:8080/banks", () => HttpResponse.json(mockBanks)),
  http.get("http://localhost:8080/settings/defaults/DEFAULT_BANK", () =>
    HttpResponse.json(defaultBankSetting),
  ),
  http.post("http://localhost:8080/banks", () =>
    HttpResponse.json(newBank, { status: 201 }),
  ),
  http.delete("http://localhost:8080/banks/:id", () =>
    new HttpResponse(null, { status: 204 }),
  ),
  http.put("http://localhost:8080/settings/defaults/:key", () =>
    HttpResponse.json({ key: "DEFAULT_BANK", value: 2 }),
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
  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

function renderSettingBank() {
  const { wrapper, queryClient } = makeWrapper();
  const result = render(<SettingBank />, { wrapper });
  return { ...result, queryClient };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("SettingBank", () => {
  describe("render inicial", () => {
    it("muestra el título Mis Bancos", async () => {
      renderSettingBank();
      await waitFor(() => expect(screen.getByText("Mis Bancos")).toBeInTheDocument());
    });

    it("muestra los bancos del usuario", async () => {
      renderSettingBank();
      await waitFor(() => {
        expect(screen.getByText("GALICIA")).toBeInTheDocument();
        expect(screen.getByText("SANTANDER")).toBeInTheDocument();
      });
    });

    it("muestra el badge Predeterminado (i18n) en el banco por defecto", async () => {
      renderSettingBank();
      await waitFor(() =>
        expect(screen.getByText("Predeterminado")).toBeInTheDocument(),
      );
      expect(screen.queryByText(/★/)).not.toBeInTheDocument();
    });

    it("explica qué significa banco predeterminado", async () => {
      renderSettingBank();
      expect(
        await screen.findByText(/El banco predeterminado se selecciona solo/),
      ).toBeInTheDocument();
    });

    it("oculta el formulario hasta presionar Agregar", async () => {
      const user = userEvent.setup();
      renderSettingBank();
      await waitFor(() => expect(screen.getByText("GALICIA")).toBeInTheDocument());
      expect(screen.queryByLabelText("Nombre del banco")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /Agregar/ }));

      expect(await screen.findByLabelText("Nombre del banco")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Nombre del banco...")).toBeInTheDocument();
    });

    it("cierra el formulario con Cancelar", async () => {
      const user = userEvent.setup();
      renderSettingBank();
      await waitFor(() => expect(screen.getByText("GALICIA")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: /Agregar/ }));
      await user.click(await screen.findByRole("button", { name: "Cancelar" }));
      await waitFor(() =>
        expect(screen.queryByLabelText("Nombre del banco")).not.toBeInTheDocument(),
      );
    });

    it("abre el formulario por defecto cuando no hay bancos", async () => {
      server.use(
        http.get("http://localhost:8080/banks", () => HttpResponse.json([])),
      );
      renderSettingBank();
      expect(await screen.findByLabelText("Nombre del banco")).toBeInTheDocument();
      expect(screen.queryByText("GALICIA")).not.toBeInTheDocument();
    });
  });

  describe("formulario de creación", () => {
    async function openForm(user: ReturnType<typeof userEvent.setup>) {
      await waitFor(() => expect(screen.getByText("GALICIA")).toBeInTheDocument());
      await user.click(screen.getByRole("button", { name: /Agregar/ }));
      return screen.findByLabelText("Nombre del banco");
    }

    it("llama POST /banks con el texto ingresado al hacer submit", async () => {
      const user = userEvent.setup();
      let postedBody: unknown;
      server.use(
        http.post("http://localhost:8080/banks", async ({ request }) => {
          postedBody = await request.json();
          return HttpResponse.json(newBank, { status: 201 });
        }),
      );

      renderSettingBank();
      await user.type(await openForm(user), "nacion");
      await user.click(screen.getByText("Agregar"));

      await waitFor(() =>
        expect(postedBody).toEqual({ description: "nacion" }),
      );
    });

    it("agrega con Enter", async () => {
      const user = userEvent.setup();
      let postedBody: unknown;
      server.use(
        http.post("http://localhost:8080/banks", async ({ request }) => {
          postedBody = await request.json();
          return HttpResponse.json(newBank, { status: 201 });
        }),
      );

      renderSettingBank();
      await user.type(await openForm(user), "nacion{Enter}");

      await waitFor(() =>
        expect(postedBody).toEqual({ description: "nacion" }),
      );
    });

    it("muestra error de validación si se envía el form vacío", async () => {
      const user = userEvent.setup();
      renderSettingBank();
      await openForm(user);

      await user.click(screen.getByText("Agregar"));

      await waitFor(() =>
        expect(
          screen.getByText("Ingresá el nombre del banco"),
        ).toBeInTheDocument(),
      );
    });

    it("cierra el formulario tras agregar con éxito", async () => {
      const user = userEvent.setup();
      renderSettingBank();
      await user.type(await openForm(user), "nacion");
      await user.click(screen.getByText("Agregar"));

      await waitFor(() =>
        expect(screen.queryByLabelText("Nombre del banco")).not.toBeInTheDocument(),
      );
    });
  });

  describe("botón de delete", () => {
    it("el botón de eliminar está deshabilitado para el banco default", async () => {
      renderSettingBank();
      await waitFor(() => expect(screen.getByText("GALICIA")).toBeInTheDocument());

      // GALICIA (id=1) es el default → su botón de eliminar debe estar disabled
      const deleteGaliciaBtn = screen.getByRole("button", {
        name: /Eliminar banco GALICIA/i,
      });
      const deleteSantanderBtn = screen.getByRole("button", {
        name: /Eliminar banco SANTANDER/i,
      });
      expect(deleteGaliciaBtn).toBeDisabled(); // GALICIA = default
      expect(deleteSantanderBtn).not.toBeDisabled(); // SANTANDER = no default
    });

    it("el botón de eliminar no está deshabilitado para bancos no default", async () => {
      renderSettingBank();
      await waitFor(() => expect(screen.getByText("SANTANDER")).toBeInTheDocument());

      const deleteSantanderBtn = screen.getByRole("button", {
        name: /Eliminar banco SANTANDER/i,
      });
      expect(deleteSantanderBtn).not.toBeDisabled(); // SANTANDER
    });

    it("llama DELETE /banks/{id} al confirmar el popconfirm", async () => {
      const user = userEvent.setup();
      let deletedId: string | undefined;
      server.use(
        http.delete("http://localhost:8080/banks/:id", ({ params }) => {
          deletedId = params.id as string;
          return new HttpResponse(null, { status: 204 });
        }),
      );

      renderSettingBank();
      await waitFor(() => expect(screen.getByText("SANTANDER")).toBeInTheDocument());

      // Click el botón delete de SANTANDER (no es default, no está disabled)
      const deleteSantanderBtn = screen.getByRole("button", {
        name: /Eliminar banco SANTANDER/i,
      });
      await user.click(deleteSantanderBtn);

      // Confirmar en el Popconfirm
      const confirmBtn = await screen.findByText("Eliminar");
      await user.click(confirmBtn);

      // El borrado real recién se dispara tras la ventana de "deshacer" (~7s)
      await waitFor(() => expect(deletedId).toBe("2"), { timeout: 9000 });
    }, 12000);
  });

  describe("aviso de banco requerido", () => {
    it("no muestra el aviso cuando ya hay bancos cargados", async () => {
      renderSettingBank();
      await waitFor(() => expect(screen.getByText("GALICIA")).toBeInTheDocument());
      expect(screen.queryByText("Necesitás agregar un banco")).not.toBeInTheDocument();
    });

    it("muestra el aviso cuando no hay bancos cargados", async () => {
      server.use(http.get("http://localhost:8080/banks", () => HttpResponse.json([])));
      renderSettingBank();
      expect(await screen.findByText("Necesitás agregar un banco")).toBeInTheDocument();
    });
  });

  describe("establecer banco por defecto", () => {
    it("deshabilita el botón de estrella para el banco que ya es default", async () => {
      renderSettingBank();
      await waitFor(() => expect(screen.getByText("GALICIA")).toBeInTheDocument());

      const starGaliciaBtn = screen.getByRole("button", {
        name: /Estrella banco GALICIA/i,
      });
      const starSantanderBtn = screen.getByRole("button", {
        name: /Estrella banco SANTANDER/i,
      });
      expect(starGaliciaBtn).toBeDisabled(); // GALICIA = default
      expect(starSantanderBtn).not.toBeDisabled(); // SANTANDER
    });
  });
});

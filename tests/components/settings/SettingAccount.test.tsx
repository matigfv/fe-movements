import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import SettingAccount from "@/components/settings/SettingAccount";

const deleteAllMovements = vi.fn();
let mockRoles: string[] = ["ROLE_ADMIN"];

vi.mock("@/apis/movement/MovementApi", () => ({
  deleteAllMovements: () => deleteAllMovements(),
}));
vi.mock("@/apis/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({
    data: { givenName: "Ana", email: "ana@example.com", userType: "PERSONAL" },
  }),
}));
vi.mock("@/apis/hooks/useUserRoles", () => ({
  useUserRoles: () => {
    const hasRole = (r: string) => mockRoles.includes(`ROLE_${r}`);
    return { hasRole, hasAnyRole: (...rs: string[]) => rs.some(hasRole) };
  },
}));

function renderAccount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConfigProvider>
        <SettingAccount />
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function openDangerModal(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText("Zona de peligro"));
  await user.click(await screen.findByRole("button", { name: /Eliminar todos los movimientos/ }));
}

describe("SettingAccount", () => {
  beforeEach(() => {
    deleteAllMovements.mockReset();
    mockRoles = ["ROLE_ADMIN"];
  });

  it("abre con un resumen de la cuenta, no con acciones destructivas", () => {
    renderAccount();
    expect(screen.getByText("Tu cuenta")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Administrador")).toBeInTheDocument();
    expect(screen.getByText("Usuario")).toBeInTheDocument();
  });

  it("no ofrece 'Eliminar la cuenta' (no hay endpoint de baja)", () => {
    renderAccount();
    expect(screen.queryByText("Eliminar la cuenta")).not.toBeInTheDocument();
  });

  it("oculta la zona de peligro para un invitado", () => {
    mockRoles = ["ROLE_GUEST"];
    renderAccount();
    expect(screen.queryByText("Zona de peligro")).not.toBeInTheDocument();
    expect(screen.getByText("Invitado")).toBeInTheDocument();
  });

  it("el borrado exige escribir ELIMINAR", async () => {
    const user = userEvent.setup();
    renderAccount();
    await openDangerModal(user);

    const confirm = await screen.findByRole("button", { name: "Eliminar todo" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByPlaceholderText("ELIMINAR"), "eliminar");
    expect(confirm).toBeEnabled();
    expect(deleteAllMovements).not.toHaveBeenCalled();
  });

  it("al confirmar elimina y avisa del éxito", async () => {
    deleteAllMovements.mockResolvedValue({});
    const user = userEvent.setup();
    renderAccount();
    await openDangerModal(user);

    await user.type(await screen.findByPlaceholderText("ELIMINAR"), "ELIMINAR");
    await user.click(screen.getByRole("button", { name: "Eliminar todo" }));

    await waitFor(() => expect(deleteAllMovements).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Se eliminaron todos los movimientos.")).toBeInTheDocument();
  });

  it("si falla avisa del error y deja el modal abierto", async () => {
    deleteAllMovements.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderAccount();
    await openDangerModal(user);

    await user.type(await screen.findByPlaceholderText("ELIMINAR"), "ELIMINAR");
    await user.click(screen.getByRole("button", { name: "Eliminar todo" }));

    expect(await screen.findByText(/No pudimos eliminar los movimientos/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ELIMINAR")).toBeInTheDocument();
  });
});

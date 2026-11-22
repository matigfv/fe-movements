import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { SettingIncome } from "@/components/settings/SettingIncome";
import { addIncome } from "@/apis/income/IncomeApi";

vi.mock("@/apis/income/IncomeApi", () => ({
  addIncome: vi.fn(),
  deleteIncome: vi.fn(),
  reloadIncome: vi.fn(),
}));

vi.mock("@/apis/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ data: { id: 1, email: "t@t.com", userType: "PERSONAL" } }),
}));

vi.mock("@/apis/hooks/useIncome", () => ({
  useIncome: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/apis/hooks/useBank", () => ({
  useBanks: () => ({ data: [{ id: 1, description: "GALICIA" }] }),
}));

vi.mock("@/apis/hooks/useCurrency", () => ({
  useCurrency: () => ({ data: [{ id: 1, symbol: "$", description: "Peso" }] }),
}));

vi.mock("@/apis/hooks/useSettings", () => ({
  useUserDefault: () => ({ data: { value: 1 } }),
}));

function renderIncome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<SettingIncome />, { wrapper });
}

describe("SettingIncome", () => {
  beforeEach(() => {
    vi.mocked(addIncome).mockReset();
  });

  it("muestra etiquetas visibles en los campos del formulario", () => {
    renderIncome();
    expect(screen.getByText("Banco")).toBeInTheDocument();
    expect(screen.getByText("Moneda")).toBeInTheDocument();
    expect(screen.getByLabelText("Monto")).toBeInTheDocument();
  });

  it("conserva lo ingresado si el request falla", async () => {
    const user = userEvent.setup();
    vi.mocked(addIncome).mockRejectedValue(new Error("boom"));
    renderIncome();

    await user.type(screen.getByLabelText("Monto"), "150");
    await user.click(screen.getByRole("button", { name: /Agregar ingreso/ }));

    await waitFor(() => expect(addIncome).toHaveBeenCalledTimes(1));
    // Espera a que la mutación termine (error) y verifica que el input sigue intacto.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Agregar ingreso/ })).not.toHaveClass(
        "ant-btn-loading",
      ),
    );
    expect(screen.getByLabelText("Monto")).toHaveValue("150.00");
  });

  it("limpia el formulario solo cuando el request tiene éxito", async () => {
    const user = userEvent.setup();
    vi.mocked(addIncome).mockResolvedValue(undefined as never);
    renderIncome();

    await user.type(screen.getByLabelText("Monto"), "150");
    await user.click(screen.getByRole("button", { name: /Agregar ingreso/ }));

    await waitFor(() => expect(screen.getByLabelText("Monto")).toHaveValue(""));
  });
});

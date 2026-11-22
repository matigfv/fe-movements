import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import type { ReactNode } from "react";
import BankOnboarding from "@/components/onboarding/BankOnboarding";
import type { OnboardingBankEntry } from "@/apis/onboarding/OnboardingApi";

function wrapper({ children }: { children: ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}

function renderBanco(
  onNext = vi.fn(),
  onPrev = vi.fn(),
  initialValues: { banksToAdd?: OnboardingBankEntry[] } = {},
) {
  return render(
    <BankOnboarding
      initialValues={initialValues}
      onNext={onNext}
      onPrev={onPrev}
    />,
    { wrapper },
  );
}

describe("BankOnboarding", () => {
  describe("render inicial", () => {
    it("muestra el texto descriptivo", () => {
      renderBanco();
      expect(
        screen.getByText(/agregá los bancos que usás/i),
      ).toBeInTheDocument();
    });

    it("muestra el input de nombre de banco", () => {
      renderBanco();
      expect(
        screen.getByPlaceholderText("Nombre del banco..."),
      ).toBeInTheDocument();
    });

    it("muestra los botones Volver y Siguiente", () => {
      renderBanco();
      expect(screen.getByText("Volver")).toBeInTheDocument();
      expect(screen.getByText("Siguiente")).toBeInTheDocument();
    });

    it("muestra estado vacío cuando no hay bancos", () => {
      renderBanco();
      expect(
        screen.getByText(/no agregaste bancos aún/i),
      ).toBeInTheDocument();
    });

    it("muestra los bancos pre-cargados desde initialValues", () => {
      renderBanco(vi.fn(), vi.fn(), {
        banksToAdd: [
          { description: "GALICIA", isDefault: true },
          { description: "SANTANDER", isDefault: false },
        ],
      });
      expect(screen.getByText("Galicia")).toBeInTheDocument();
      expect(screen.getByText("Santander")).toBeInTheDocument();
    });
  });

  describe("agregar bancos", () => {
    it("agrega un banco al hacer click en Agregar", async () => {
      const user = userEvent.setup();
      renderBanco();

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Galicia");
      await user.click(screen.getByRole("button", { name: /agregar/i }));

      await waitFor(() =>
        expect(screen.getByText("Galicia")).toBeInTheDocument(),
      );
    });

    it("el primer banco agregado se marca como default automáticamente", async () => {
      const user = userEvent.setup();
      renderBanco();

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Galicia");
      await user.click(screen.getByRole("button", { name: /agregar/i }));

      await waitFor(() =>
        expect(screen.getByText("Principal")).toBeInTheDocument(),
      );
    });

    it("el segundo banco agregado NO es default automáticamente", async () => {
      const user = userEvent.setup();
      renderBanco();

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Galicia");
      await user.click(screen.getByRole("button", { name: /agregar/i }));
      await waitFor(() => expect(screen.getByText("Galicia")).toBeInTheDocument());

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Santander");
      await user.click(screen.getByRole("button", { name: /agregar/i }));
      await waitFor(() => expect(screen.getByText("Santander")).toBeInTheDocument());

      // Solo debe haber un badge "Default"
      expect(screen.getAllByText("Principal")).toHaveLength(1);
    });

    it("limpia el input después de agregar", async () => {
      const user = userEvent.setup();
      renderBanco();

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Galicia");
      await user.click(screen.getByRole("button", { name: /agregar/i }));

      // Re-query after re-render to avoid stale ref
      await waitFor(() =>
        expect(screen.getByPlaceholderText("Nombre del banco...")).toHaveValue(""),
      );
    });

    it("no agrega un banco duplicado (case-insensitive)", async () => {
      const user = userEvent.setup();
      renderBanco(vi.fn(), vi.fn(), {
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "galicia");
      await user.click(screen.getByRole("button", { name: /agregar/i }));

      await waitFor(() =>
        expect(screen.getByText("Ya lo agregaste")).toBeInTheDocument(),
      );
      expect(screen.getAllByText("Galicia")).toHaveLength(1);
    });
  });

  describe("validación", () => {
    it("muestra error si el campo está vacío al intentar agregar", async () => {
      const user = userEvent.setup();
      renderBanco();

      await user.click(screen.getByRole("button", { name: /agregar/i }));

      await waitFor(() =>
        expect(
          screen.getByText(/ingresá el nombre del banco/i),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("cambiar banco default", () => {
    it("cambia el banco default al hacer click en la estrella de otro banco", async () => {
      const user = userEvent.setup();
      renderBanco(vi.fn(), vi.fn(), {
        banksToAdd: [
          { description: "GALICIA", isDefault: true },
          { description: "SANTANDER", isDefault: false },
        ],
      });

      const starBtn = screen.getByRole("button", {
        name: /marcar banco SANTANDER como principal/i,
      });
      await user.click(starBtn);

      await waitFor(() => {
        // El botón de estrella de SANTANDER ahora debe estar deshabilitado (ya es default)
        expect(
          screen.getByRole("button", { name: /marcar banco SANTANDER como principal/i }),
        ).toBeDisabled();
      });
    });

    it("el botón de estrella del banco default está deshabilitado", () => {
      renderBanco(vi.fn(), vi.fn(), {
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });

      expect(
        screen.getByRole("button", { name: /marcar banco GALICIA como principal/i }),
      ).toBeDisabled();
    });
  });

  describe("eliminar bancos", () => {
    it("elimina un banco al hacer click en su botón Eliminar", async () => {
      const user = userEvent.setup();
      renderBanco(vi.fn(), vi.fn(), {
        banksToAdd: [
          { description: "GALICIA", isDefault: true },
          { description: "SANTANDER", isDefault: false },
        ],
      });

      await user.click(
        screen.getByRole("button", { name: /eliminar banco SANTANDER/i }),
      );

      await waitFor(() =>
        expect(screen.queryByText("Santander")).not.toBeInTheDocument(),
      );
    });

    it("al eliminar el banco default, el siguiente pasa a ser default", async () => {
      const user = userEvent.setup();
      renderBanco(vi.fn(), vi.fn(), {
        banksToAdd: [
          { description: "GALICIA", isDefault: true },
          { description: "SANTANDER", isDefault: false },
        ],
      });

      await user.click(
        screen.getByRole("button", { name: /eliminar banco GALICIA/i }),
      );

      await waitFor(() => {
        expect(screen.queryByText("Galicia")).not.toBeInTheDocument();
        // SANTANDER ahora debe ser default
        expect(
          screen.getByRole("button", { name: /marcar banco SANTANDER como principal/i }),
        ).toBeDisabled();
      });
    });

    it("al eliminar el único banco, muestra estado vacío", async () => {
      const user = userEvent.setup();
      renderBanco(vi.fn(), vi.fn(), {
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });

      await user.click(
        screen.getByRole("button", { name: /eliminar banco GALICIA/i }),
      );

      await waitFor(() =>
        expect(screen.getByText(/no agregaste bancos aún/i)).toBeInTheDocument(),
      );
    });
  });

  describe("navegación", () => {
    it("llama onPrev con los bancos actuales al hacer click en Volver", async () => {
      const user = userEvent.setup();
      const onPrev = vi.fn();
      renderBanco(vi.fn(), onPrev, {
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });

      await user.click(screen.getByText("Volver"));

      expect(onPrev).toHaveBeenCalledTimes(1);
      expect(onPrev).toHaveBeenCalledWith({
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });
    });

    it("agrega el texto pendiente al hacer click en Siguiente", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      renderBanco(onNext);

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Galicia");
      await user.click(screen.getByText("Siguiente"));

      expect(onNext).toHaveBeenCalledWith({
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });
    });

    it("agrega el texto pendiente al hacer click en Volver", async () => {
      const user = userEvent.setup();
      const onPrev = vi.fn();
      renderBanco(vi.fn(), onPrev, {
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });

      await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Santander");
      await user.click(screen.getByText("Volver"));

      expect(onPrev).toHaveBeenCalledWith({
        banksToAdd: [
          { description: "GALICIA", isDefault: true },
          { description: "SANTANDER", isDefault: false },
        ],
      });
    });

    it("llama onNext con los bancos actuales al hacer click en Siguiente", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      renderBanco(onNext, vi.fn(), {
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });

      await user.click(screen.getByText("Siguiente"));

      expect(onNext).toHaveBeenCalledWith({
        banksToAdd: [{ description: "GALICIA", isDefault: true }],
      });
    });

    it("llama onNext con array vacío si no hay bancos", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      renderBanco(onNext);

      await user.click(screen.getByText("Siguiente"));

      expect(onNext).toHaveBeenCalledWith({ banksToAdd: [] });
    });
  });
});

describe("BankOnboarding finish now", () => {
  it("no muestra el botón sin onFinishNow", () => {
    renderBanco();
    expect(screen.queryByText("Terminar ahora con esto")).not.toBeInTheDocument();
  });

  it("llama onFinishNow con la lista y el texto pendiente, sin llamar onNext", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onFinishNow = vi.fn();
    render(
      <BankOnboarding
        initialValues={{ banksToAdd: [{ description: "GALICIA", isDefault: true }] }}
        onNext={onNext}
        onPrev={vi.fn()}
        onFinishNow={onFinishNow}
      />,
      { wrapper },
    );
    await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Mi banco");
    await user.click(screen.getByText("Terminar ahora con esto"));
    expect(onFinishNow).toHaveBeenCalledWith({
      banksToAdd: [
        { description: "GALICIA", isDefault: true },
        { description: "MI BANCO", isDefault: false },
      ],
    });
    expect(onNext).not.toHaveBeenCalled();
  });
});

describe("BankOnboarding suggestions", () => {
  it("muestra sugerencias al escribir", async () => {
    const user = userEvent.setup();
    renderBanco();
    await user.type(screen.getByPlaceholderText("Nombre del banco..."), "sant");
    expect((await screen.findAllByText("Santander")).length).toBeGreaterThan(0);
  });

  it("excluye bancos ya agregados", async () => {
    const user = userEvent.setup();
    renderBanco(vi.fn(), vi.fn(), { banksToAdd: [{ description: "SANTANDER", isDefault: true }] });
    await user.type(screen.getByPlaceholderText("Nombre del banco..."), "an");
    expect((await screen.findAllByText("Bankinter")).length).toBeGreaterThan(0);
    const options = [...document.querySelectorAll(".ant-select-item-option")].map((e) => e.textContent);
    expect(options).not.toContain("Santander");
  });

  it("permite texto libre", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    renderBanco(onNext);
    await user.type(screen.getByPlaceholderText("Nombre del banco..."), "Banco Raro");
    await user.click(screen.getByText("Siguiente"));
    expect(onNext).toHaveBeenCalledWith({ banksToAdd: [{ description: "BANCO RARO", isDefault: true }] });
  });
});

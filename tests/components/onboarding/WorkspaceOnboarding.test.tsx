import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfigProvider } from "antd";
import type { ReactNode } from "react";
import WorkspaceOnboarding from "@/components/onboarding/WorkspaceOnboarding";

function wrapper({ children }: { children: ReactNode }) {
  return <ConfigProvider>{children}</ConfigProvider>;
}

function renderWorkspace(
  onNext = vi.fn(),
  onPrev = vi.fn(),
  initialValues = {},
) {
  return render(
    <WorkspaceOnboarding initialValues={initialValues} onNext={onNext} onPrev={onPrev} />,
    { wrapper },
  );
}

async function addWorkspace(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.type(screen.getByPlaceholderText("Ej: Familia, Trabajo, Personal..."), name);
  await user.click(screen.getByText("Crear workspace"));
}

describe("WorkspaceOnboarding", () => {
  describe("render inicial", () => {
    it("muestra el texto descriptivo", () => {
      renderWorkspace();
      expect(screen.getByText(/querés crear algunos workspaces/i)).toBeInTheDocument();
    });

    it("muestra un input vacío por defecto", () => {
      renderWorkspace();
      expect(screen.getByPlaceholderText("Ej: Familia, Trabajo, Personal...")).toBeInTheDocument();
    });

    it("muestra el estado vacío cuando no hay workspaces agregados", () => {
      renderWorkspace();
      expect(
        screen.getByText(/Todavía no agregaste ningún workspace/i),
      ).toBeInTheDocument();
    });

    it("muestra los botones Volver y Siguiente (sin Omitir)", () => {
      renderWorkspace();
      expect(screen.getByText("Volver")).toBeInTheDocument();
      expect(screen.getByText("Siguiente")).toBeInTheDocument();
      expect(screen.queryByText("Omitir por ahora")).not.toBeInTheDocument();
    });
  });

  describe("agregar y eliminar workspaces", () => {
    it("agrega un workspace a la lista al hacer click en Crear workspace", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await addWorkspace(user, "Familia");

      expect(screen.getByText("Familia")).toBeInTheDocument();
      expect(
        screen.queryByText(/Todavía no agregaste ningún workspace/i),
      ).not.toBeInTheDocument();
    });

    it("marca el primer workspace agregado como default automáticamente", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await addWorkspace(user, "Familia");

      expect(screen.getByText("Principal")).toBeInTheDocument();
    });

    it("permite cambiar el workspace default con la estrella", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await addWorkspace(user, "Familia");
      await addWorkspace(user, "Trabajo");

      const [, setDefaultButton] = screen.getAllByRole("button", {
        name: /Marcar workspace .* como principal/i,
      });
      await user.click(setDefaultButton);

      const trabajoRow = screen.getByText("Trabajo").closest("div")!;
      expect(trabajoRow).toHaveTextContent("Principal");
    });

    it("muestra el botón de eliminar por cada workspace agregado", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await addWorkspace(user, "Familia");
      await addWorkspace(user, "Trabajo");

      expect(
        screen.getAllByRole("button", { name: /Eliminar workspace/i }),
      ).toHaveLength(2);
    });

    it("al eliminar el default, el primero restante pasa a ser default", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await addWorkspace(user, "Familia");
      await addWorkspace(user, "Trabajo");

      await user.click(
        screen.getByRole("button", { name: "Eliminar workspace Familia" }),
      );

      const trabajoRow = screen.getByText("Trabajo").closest("div")!;
      expect(trabajoRow).toHaveTextContent("Principal");
    });
  });

  describe("validación", () => {
    it("rechaza nombres con números o símbolos", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await user.type(screen.getByPlaceholderText("Ej: Familia, Trabajo, Personal..."), "Grupo@!");
      await user.click(screen.getByText("Crear workspace"));

      await waitFor(() =>
        expect(screen.getByText("Usá letras, números o & / . -")).toBeInTheDocument(),
      );
    });

    it("acepta números y puntuación permitida", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await addWorkspace(user, "Hogar 2");

      await waitFor(() => expect(screen.getByText("Hogar 2")).toBeInTheDocument());
    });

    it("muestra error si el workspace ya existe", async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await addWorkspace(user, "Familia");
      await addWorkspace(user, "familia");

      await waitFor(() =>
        expect(screen.getByText("Ya lo agregaste")).toBeInTheDocument(),
      );
    });

    it("avanza con el workspace agregado y marcado como default al escribir un nombre válido", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      renderWorkspace(onNext);

      await addWorkspace(user, "Familia");
      await user.click(screen.getByText("Siguiente"));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(onNext).toHaveBeenCalledWith({
        workspacesToAdd: [{ name: "Familia", isDefault: true }],
      });
    });

    it("avanza con workspacesToAdd vacío cuando no se agregó ningún workspace", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      renderWorkspace(onNext);

      await user.click(screen.getByText("Siguiente"));

      await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
      expect(onNext).toHaveBeenCalledWith({ workspacesToAdd: [] });
    });
  });

  describe("navegación", () => {
    it("llama onPrev con los workspaces actuales al hacer click en Volver", async () => {
      const user = userEvent.setup();
      const onPrev = vi.fn();
      renderWorkspace(vi.fn(), onPrev);

      await addWorkspace(user, "Familia");
      await user.click(screen.getByText("Volver"));

      expect(onPrev).toHaveBeenCalledTimes(1);
      expect(onPrev).toHaveBeenCalledWith({
        workspacesToAdd: [{ name: "Familia", isDefault: true }],
      });
    });

    it("agrega el texto pendiente al hacer click en Siguiente", async () => {
      const user = userEvent.setup();
      const onNext = vi.fn();
      renderWorkspace(onNext);

      await user.type(screen.getByPlaceholderText("Ej: Familia, Trabajo, Personal..."), "Familia");
      await user.click(screen.getByText("Siguiente"));

      expect(onNext).toHaveBeenCalledWith({
        workspacesToAdd: [{ name: "Familia", isDefault: true }],
      });
    });

    it("no agrega el texto pendiente inválido y no bloquea la navegación", async () => {
      const user = userEvent.setup();
      const onPrev = vi.fn();
      renderWorkspace(vi.fn(), onPrev);

      await user.type(screen.getByPlaceholderText("Ej: Familia, Trabajo, Personal..."), "Grupo@!");
      await user.click(screen.getByText("Volver"));

      expect(onPrev).toHaveBeenCalledWith({ workspacesToAdd: [] });
    });
  });

  describe("Omitir", () => {
    it("no existe el botón Omitir por ahora", () => {
      renderWorkspace();
      expect(screen.queryByText("Omitir por ahora")).not.toBeInTheDocument();
    });
  });
});

describe("WorkspaceOnboarding finish now", () => {
  it("no muestra el botón sin onFinishNow", () => {
    renderWorkspace();
    expect(screen.queryByText("Terminar ahora con esto")).not.toBeInTheDocument();
  });

  it("llama onFinishNow con la lista y el texto pendiente, sin llamar onNext", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onFinishNow = vi.fn();
    render(
      <WorkspaceOnboarding initialValues={{}} onNext={onNext} onPrev={vi.fn()} onFinishNow={onFinishNow} />,
      { wrapper },
    );
    await user.type(screen.getByPlaceholderText("Ej: Familia, Trabajo, Personal..."), "Casa");
    await user.click(screen.getByText("Terminar ahora con esto"));
    expect(onFinishNow).toHaveBeenCalledWith({
      workspacesToAdd: [{ name: "Casa", isDefault: true }],
    });
    expect(onNext).not.toHaveBeenCalled();
  });
});
